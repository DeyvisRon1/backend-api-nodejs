
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { prisma } from "./db";
import issuesRouter from "./routes/issues";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use("/issues", issuesRouter);

// Endpoint simple para comprobar que:
// 1) el server corre
// 2) Prisma conecta a la DB
app.get("/health", async (_req, res) => {
  const dbNow = await prisma.$queryRaw`SELECT NOW() as now`;
  res.json({ ok: true, dbNow, ts: new Date().toISOString() });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`✅ API OK -> http://localhost:${port}`);
});
