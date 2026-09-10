import { AsyncLocalStorage } from "node:async_hooks";
import type { PoolClient } from "pg";
export interface TransactionContext {
  readonly transactionId: symbol;
}
export const activeClient = new AsyncLocalStorage<{
  context: TransactionContext;
  client: PoolClient;
}>();
