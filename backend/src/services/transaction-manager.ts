import mongoose, { type ClientSession } from "mongoose";
export interface ITransactionManager {
  runInTransaction<T>(work: (s: ClientSession) => Promise<T>): Promise<T>;
}
export class MongoTransactionManager implements ITransactionManager {
  async runInTransaction<T>(work: (s: ClientSession) => Promise<T>) {
    const session = await mongoose.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  }
}
