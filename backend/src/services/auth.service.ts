import type { IUserRepository } from "../repositories/interfaces/user.repository.interface.js";
import type { IStudentRepository } from "../repositories/interfaces/student.repository.interface.js";
import type { ITokenService } from "./token.service.js";
import type { IPasswordHasher } from "./password-hasher.service.js";
import type { ITransactionManager } from "./transaction-manager.js";
import { AppError } from "../errors/AppError.js";
import { UserMapper } from "../mappers/user.mapper.js";
export type RegisterInput = {
  username: string;
  password: string;
  fullName: string;
  mssv: string;
  email?: string;
};
export class AuthService {
  constructor(
    private users: IUserRepository,
    private students: IStudentRepository,
    private tokens: ITokenService,
    private passwords: IPasswordHasher,
    private tx: ITransactionManager,
  ) {}
  private pair(userId: string, role: "STUDENT" | "ADMIN" | "STAFF") {
    const p = { userId, role };
    return {
      accessToken: this.tokens.generateAccessToken(p),
      refreshToken: this.tokens.generateRefreshToken(p),
    };
  }

  private transactionUnsupported(error: unknown): boolean {
    const message = error instanceof Error ? error.message : "";
    return /Transaction numbers are only allowed|replica set|mongos/i.test(
      message,
    );
  }

  private async createStudentAccountWithoutTransaction(
    input: RegisterInput,
    passwordHash: string,
  ) {
    const user = await this.users.create({
      username: input.username,
      passwordHash,
      role: "STUDENT",
      fullName: input.fullName,
      email: input.email,
    });

    try {
      await this.students.create({ userId: user._id, mssv: input.mssv });
      return user;
    } catch (error) {
      await this.users.deleteById(user._id.toString());
      throw error;
    }
  }

  async register(i: RegisterInput) {
    if (await this.users.findByUsername(i.username))
      throw new AppError(
        409,
        "USERNAME_ALREADY_EXISTS",
        "Tên đăng nhập đã tồn tại",
      );
    if (await this.students.findByMssv(i.mssv))
      throw new AppError(
        409,
        "MSSV_ALREADY_EXISTS",
        "Mã số sinh viên đã tồn tại",
      );
    const passwordHash = await this.passwords.hash(i.password);
    let user;

    try {
      user = await this.tx.runInTransaction(async (session) => {
        const createdUser = await this.users.create(
          {
            username: i.username,
            passwordHash,
            role: "STUDENT",
            fullName: i.fullName,
            email: i.email,
          },
          session,
        );

        await this.students.create(
          { userId: createdUser._id, mssv: i.mssv },
          session,
        );

        return createdUser;
      });
    } catch (error) {
      if (!this.transactionUnsupported(error)) throw error;
      user = await this.createStudentAccountWithoutTransaction(i, passwordHash);
    }

    return {
      ...this.pair(user._id.toString(), user.role),
      user: UserMapper.toResponse(user),
    };
  }
  async login(username: string, password: string) {
    const u = await this.users.findByUsername(username);
    if (!u || !(await this.passwords.compare(password, u.passwordHash)))
      throw new AppError(
        401,
        "INVALID_CREDENTIALS",
        "Tên đăng nhập hoặc mật khẩu không đúng",
      );
    if (u.status !== "ACTIVE")
      throw new AppError(403, "FORBIDDEN", "Tài khoản đã bị khóa");
    return {
      ...this.pair(u._id.toString(), u.role),
      user: UserMapper.toResponse(u),
    };
  }
  refresh(token: string) {
    const p = this.tokens.verifyRefreshToken(token);
    return this.pair(p.userId, p.role);
  }
  async me(id: string) {
    const u = await this.users.findById(id);
    if (!u) throw new AppError(401, "UNAUTHORIZED", "Không tìm thấy tài khoản");
    return UserMapper.toResponse(u);
  }
}
