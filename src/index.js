const app = require("./app"); 
const logger = require("./lib/logger");
const prisma = require("./lib/prisma");

const PORT = process.env.PORT || 3000;

// starting the server
const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, "server listening");
});

// graceful shutdown
async function shutdown() {
  await prisma.$disconnect();
  logger.info("Prisma disconnected, shutting down...");
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);