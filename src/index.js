const express = require("express");
const app = express();
// use the port 3000 or environment variable 
const PORT = process.env.PORT || 3000;

// STEP 10: Import the prisma client
const prisma = require("./lib/prisma");

// import the router 
const questionsRouter = require("./routes/questions");

// middlwaree for reading JSON data
app.use(express.json());

// define questions to be routed to questionsRouter 
app.use("/api/questions", questionsRouter);

// add "Not found" if we can't locate the route 
app.use((req, res) => {
  res.status(404).json({ msg: "Not found" });
});

// error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ msg: "Something went wrong!" });
});

// graceful shutdown
const gracefulShutdown = async () => {
  await prisma.$disconnect();
  console.log("Prisma disconnected, shutting down...");
  process.exit(0);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// server start 
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});