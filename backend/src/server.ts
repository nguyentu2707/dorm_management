import { app } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
async function main() {
  await connectDatabase();
  const server = app.listen(env.PORT, () =>
    console.log(`Server listening on port ${env.PORT}`),
  );
  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    server.close(() => {
      void disconnectDatabase();
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
main().catch(async () => {
  console.error("Startup failed: check configuration and database readiness");
  await disconnectDatabase();
  process.exitCode = 1;
});
