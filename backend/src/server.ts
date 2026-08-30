import { app } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
async function main() {
  await connectDatabase();
  app.listen(env.PORT, () =>
    console.log(`Server listening on port ${env.PORT}`),
  );
}
main().catch((e) => {
  console.error("Startup failed", e);
  process.exit(1);
});
