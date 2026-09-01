import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";

const collections = [
  "roomchangerequests",
  "maintenancerequests",
  "contracts",
  "equipmentitems",
  "beds",
  "rooms",
];

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing");
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection is not ready");

  const stamp = new Date()
    .toISOString()
    .replaceAll(":", "-")
    .replaceAll(".", "-");
  const backupDirectory = path.resolve("backups", `dormitory-reset-${stamp}`);
  await mkdir(backupDirectory, { recursive: true });

  const before = {};
  for (const name of collections) {
    const documents = await db.collection(name).find({}).toArray();
    before[name] = documents.length;
    await writeFile(
      path.join(backupDirectory, `${name}.json`),
      JSON.stringify(documents, null, 2),
      "utf8",
    );
  }

  const deleted = {};
  for (const name of collections) {
    deleted[name] = (await db.collection(name).deleteMany({})).deletedCount;
  }

  console.log(JSON.stringify({ backupDirectory, before, deleted }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
