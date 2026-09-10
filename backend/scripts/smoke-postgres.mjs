import "dotenv/config";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { requireTestDatabase } from "./test-database-url.mjs";
const url = process.env.TEST_DATABASE_URL;
requireTestDatabase(url);
const env = { ...process.env, DATABASE_URL: url, PORT: "3017" };
delete env.MONGO_URI;
const child = spawn(process.execPath, ["dist/server.js"], {
  env,
  stdio: ["ignore", "pipe", "pipe"],
});
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Startup timed out")),
      10000,
    );
    child.once("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.once("exit", () => {
      clearTimeout(timer);
      reject(new Error("Server exited before ready"));
    });
    child.stdout.on("data", (data) => {
      if (data.toString().includes("Server listening")) {
        clearTimeout(timer);
        resolve();
      }
    });
  });
  const health = await fetch("http://127.0.0.1:3017/health");
  assert.equal(health.status, 200);
  const html = await fetch("http://127.0.0.1:3017/admin/payments");
  assert.equal(html.status, 200);
  assert.match(await html.text(), /<html/);
  const protectedRoute = await fetch(
    "http://127.0.0.1:3017/api/v1/admin/payments",
  );
  assert.equal(protectedRoute.status, 401);
  console.log(
    "Startup, health, frontend shell and protected API passed without MONGO_URI",
  );
} finally {
  child.kill();
}
