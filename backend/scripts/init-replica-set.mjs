import "dotenv/config";
import mongoose from "mongoose";

async function main() {
  if (!process.env.MONGO_URI) throw new Error("Thiếu MONGO_URI trong .env");
  await mongoose.connect(process.env.MONGO_URI, { directConnection: true });
  try {
    const result = await mongoose.connection.db.admin().command({
      replSetInitiate: {
        _id: "rs0",
        members: [{ _id: 0, host: "127.0.0.1:27017" }],
      },
    });
    console.log("Đã khởi tạo MongoDB replica set rs0.", result);
  } catch (error) {
    if (/already initialized/i.test(error instanceof Error ? error.message : ""))
      console.log("MongoDB replica set rs0 đã được khởi tạo trước đó.");
    else throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
