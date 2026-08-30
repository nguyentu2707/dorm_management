import express from "express";
import cors from "cors";
import path from "node:path";
import { apiRouter } from "./routes/index.js";
import { errorHandler } from "./middlewares/error-handler.js";

export const app = express();
const frontendDist = path.resolve(process.cwd(), "../frontend/dist");

app.disable("x-powered-by");
app.use(cors());
app.use(express.json());
app.get("/health", (_q, r) =>
  r.json({ success: true, message: "OK", data: {} }),
);
app.use("/api/v1", apiRouter);
app.use("/api/v1", (_q, r) =>
  r.status(404).json({
    success: false,
    message: "Không tìm thấy endpoint",
    code: "NOT_FOUND",
  }),
);
app.use(express.static(frontendDist));
app.get("*", (_q, res) => res.sendFile(path.join(frontendDist, "index.html")));
app.use(errorHandler);
