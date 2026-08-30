import bcrypt from "bcrypt";
export interface IPasswordHasher {
  hash(p: string): Promise<string>;
  compare(p: string, h: string): Promise<boolean>;
}
export class BcryptPasswordHasher implements IPasswordHasher {
  hash(p: string) {
    return bcrypt.hash(p, 12);
  }
  compare(p: string, h: string) {
    return bcrypt.compare(p, h);
  }
}
