const express = require("express");
const app = express();
// use the port 3000 or environment variable 
const PORT = process.env.PORT || 3000;

// import the router 
const questionsRouter = require("./routes/questions");

// Middleware for reading JSON data
app.use(express.json());

// define API questions to be routed to questionsRouter 
app.use("/api/questions", questionsRouter);

// add Not found response if we can't locate the route 
app.use((req, res) => {
  res.status(404).json({ msg: "Not found" });
});

// Server start 
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});