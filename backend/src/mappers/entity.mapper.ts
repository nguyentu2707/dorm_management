export class EntityMapper {
  static toResponse<T extends { id: string }>(doc: T) {
    const { passwordHash, ...safe } = doc as T & { passwordHash?: string };
    return safe;
  }
}
