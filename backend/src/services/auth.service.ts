import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type { IUserRepository } from "../repositories/interfaces/user.repository.interface.js";
import type { IStudentRepository } from "../repositories/interfaces/student.repository.interface.js";
import type { IRefreshSessionRepository } from "../repositories/interfaces/refresh-session.repository.interface.js";
import type { IStudentRegistryRepository } from "../repositories/interfaces/student-registry.repository.interface.js";
import type { ITokenService } from "./token.service.js";
import type { IPasswordHasher } from "./password-hasher.service.js";
import type { ITransactionManager, TransactionContext } from "./transaction-manager.js";
import type { UserDocument } from "../models/user.model.js";
import { AppError } from "../errors/AppError.js";
import { UserMapper } from "../mappers/user.mapper.js";

export type RegisterInput = { username: string; password: string; mssv: string; email: string };
export type SessionMetadata = { userAgent?: string };
const normalizedCode = (value: string) => value.trim().toUpperCase();
const normalizedEmail = (value: string) => value.trim().toLowerCase();
const tokenHash = (value: string) => createHash("sha256").update(value).digest("hex");
const sameHash = (left: string, right: string) => {
  const a = Buffer.from(left, "hex"), b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
};

export class AuthService {
  constructor(
    private users: IUserRepository,
    private students: IStudentRepository,
    private sessions: IRefreshSessionRepository,
    private registry: IStudentRegistryRepository,
    private tokens: ITokenService,
    private passwords: IPasswordHasher,
    private tx: ITransactionManager,
  ) {}

  private async issue(user: UserDocument, metadata: SessionMetadata, tx: TransactionContext) {
    const sessionId = randomUUID();
    const refresh = this.tokens.generateRefreshToken(user.id, sessionId);
    await this.sessions.create({
      id: sessionId,
      userId: user.id,
      tokenHash: tokenHash(refresh.token),
      expiresAt: refresh.expiresAt,
      userAgent: metadata.userAgent?.slice(0, 1000),
    }, tx);
    return {
      accessToken: this.tokens.generateAccessToken({ userId: user.id, role: user.role }),
      refreshToken: refresh.token,
      refreshExpiresAt: refresh.expiresAt,
    };
  }

  async register(input: RegisterInput, metadata: SessionMetadata = {}) {
    const studentCode = normalizedCode(input.mssv), email = normalizedEmail(input.email);
    const passwordHash = await this.passwords.hash(input.password);
    return this.tx.runInTransaction(async (tx) => {
      const identity = await this.registry.findByStudentCodeForUpdate(studentCode, tx);
      if (!identity)
        throw new AppError(404, "STUDENT_NOT_IN_REGISTRY", "Không tìm thấy sinh viên trong danh sách xác minh");
      if (identity.status === "DISABLED")
        throw new AppError(403, "STUDENT_REGISTRY_DISABLED", "Hồ sơ sinh viên không được phép đăng ký");
      if (identity.status !== "AVAILABLE" || identity.claimedUserId)
        throw new AppError(409, "STUDENT_REGISTRY_ALREADY_CLAIMED", "Mã số sinh viên đã được đăng ký");
      if (!identity.email || normalizedEmail(identity.email) !== email)
        throw new AppError(400, "STUDENT_IDENTITY_MISMATCH", "Mã số sinh viên và email không khớp thông tin xác minh");
      if (!identity.gender)
        throw new AppError(409, "STUDENT_REGISTRY_INCOMPLETE", "Hồ sơ xác minh chưa có giới tính");
      if (await this.users.findByUsername(input.username, tx))
        throw new AppError(409, "USERNAME_ALREADY_EXISTS", "Tên đăng nhập đã tồn tại");
      if (await this.users.findByEmailNormalized(email, tx))
        throw new AppError(409, "EMAIL_ALREADY_EXISTS", "Email đã tồn tại");
      if (await this.students.findByMssv(studentCode))
        throw new AppError(409, "STUDENT_CODE_ALREADY_EXISTS", "Mã số sinh viên đã tồn tại");
      const user = await this.users.create({
        username: input.username,
        passwordHash,
        role: "STUDENT",
        fullName: identity.fullName,
        email,
      }, tx);
      await this.students.create({
        userId: user.id,
        mssv: identity.studentCode,
        gender: identity.gender,
        dob: identity.dateOfBirth,
      }, tx);
      if (!(await this.registry.claim(identity.id, user.id, tx)))
        throw new AppError(409, "STUDENT_REGISTRY_ALREADY_CLAIMED", "Mã số sinh viên vừa được đăng ký");
      return { ...(await this.issue(user, metadata, tx)), user: UserMapper.toResponse(user) };
    });
  }

  async login(username: string, password: string, metadata: SessionMetadata = {}) {
    const user = await this.users.findByUsername(username.trim());
    if (!user || !(await this.passwords.compare(password, user.passwordHash)))
      throw new AppError(401, "INVALID_CREDENTIALS", "Tên đăng nhập hoặc mật khẩu không đúng");
    if (user.status !== "ACTIVE")
      throw new AppError(403, "FORBIDDEN", "Tài khoản đã bị khóa");
    const result = await this.tx.runInTransaction(async (tx) => {
      const current = await this.users.findByIdForUpdate(user.id, tx);
      if (!current || current.status !== "ACTIVE")
        throw new AppError(403, "FORBIDDEN", "TÃ i khoáº£n Ä‘Ã£ bá»‹ khÃ³a");
      return { pair: await this.issue(current, metadata, tx), user: current };
    });
    return { ...result.pair, user: UserMapper.toResponse(result.user) };
  }

  async refresh(token?: string, metadata: SessionMetadata = {}) {
    if (!token)
      throw new AppError(401, "INVALID_TOKEN", "Thiếu refresh token");
    const payload = this.tokens.verifyRefreshToken(token);
    return this.tx.runInTransaction(async (tx) => {
      const session = await this.sessions.findByIdForUpdate(payload.sessionId, tx);
      if (!session || session.userId !== payload.userId || session.revokedAt ||
          session.expiresAt <= new Date() || !sameHash(session.tokenHash, tokenHash(token)))
        throw new AppError(401, "REFRESH_TOKEN_REVOKED", "Phiên đăng nhập đã hết hiệu lực");
      const user = await this.users.findById(payload.userId, tx);
      if (!user) throw new AppError(401, "UNAUTHORIZED", "Tài khoản không tồn tại");
      if (user.status !== "ACTIVE") throw new AppError(403, "FORBIDDEN", "Tài khoản đã bị khóa");
      if (!(await this.sessions.revokeIfActive(session.id, new Date(), tx)))
        throw new AppError(401, "REFRESH_TOKEN_REVOKED", "Phiên đăng nhập đã hết hiệu lực");
      return this.issue(user, metadata, tx);
    });
  }

  async logout(token?: string) {
    if (!token) return { revoked: false };
    try {
      const payload = this.tokens.verifyRefreshToken(token);
      await this.tx.runInTransaction(async (tx) => {
        const session = await this.sessions.findByIdForUpdate(payload.sessionId, tx);
        if (session?.userId === payload.userId)
          await this.sessions.revokeIfActive(session.id, new Date(), tx);
      });
    } catch {
      // Idempotent for missing, stale, revoked and malformed refresh tokens.
    }
    return { revoked: true };
  }
  async logoutAll(userId: string) {
    await this.sessions.revokeAllByUserId(userId);
    return { revoked: true };
  }
  async me(id: string) {
    const user = await this.users.findById(id);
    if (!user) throw new AppError(401, "UNAUTHORIZED", "Không tìm thấy tài khoản");
    return UserMapper.toResponse(user);
  }
}
