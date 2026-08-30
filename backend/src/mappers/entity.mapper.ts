type Doc = { _id: { toString(): string }; toObject(): Record<string, unknown> };
export class EntityMapper {
  static toResponse<T extends Doc>(doc: T) {
    const raw = doc.toObject();
    const { _id, __v, passwordHash, ...safe } = raw;
    return { id: _id!.toString(), ...safe };
  }
}
