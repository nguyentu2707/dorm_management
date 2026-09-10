import { pool } from "../database/pool.js";
import { activeClient, type TransactionContext } from "../database/context.js";
import { translatePostgresError } from "../database/postgres-errors.js";
export type { TransactionContext } from "../database/context.js";
export interface ITransactionManager {
  runInTransaction<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>;
}
export class PostgresTransactionManager implements ITransactionManager {
  async runInTransaction<T>(
    work: (tx: TransactionContext) => Promise<T>,
  ): Promise<T> {
    const existing = activeClient.getStore();
    if (existing) return work(existing.context);
    const client = await pool.connect();
    let discard = false;
    try {
      await client.query("BEGIN");
      const context = Object.freeze({ transactionId: Symbol("transaction") });
      const result = await activeClient.run({ context, client }, () =>
        work(context),
      );
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        discard = true;
      }
      throw translatePostgresError(error) ?? error;
    } finally {
      client.release(discard);
    }
  }
}
