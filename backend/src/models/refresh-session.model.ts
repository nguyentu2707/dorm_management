export interface RefreshSessionDocument {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  lastUsedAt?: Date;
  userAgent?: string;
  createdAt: Date;
}
