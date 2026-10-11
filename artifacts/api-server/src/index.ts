import { httpServer } from "./server";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"] || "8080"; // Port ካልተሰጠ በ default 8080 እንዲጠቀም ማድረግ ትችላለህ

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

httpServer.once("error", (err) => {
  logger.error({ err, port }, "Error listening on port");
  process.exit(1);
});

httpServer.listen(port, () => {
  logger.info({ port }, `🚀 API Server listening on port ${port}`);
});

