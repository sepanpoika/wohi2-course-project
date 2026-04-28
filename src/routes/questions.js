const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma"); 

// import the middlewares 
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");

// GET /api/questions 
// list all questions OR search by keyword from database
router.get("/", async (req, res) => {
  try {
    const { keyword } = req.query;

    // using prisma to find questions. also filter by keywoard 
    const questions = await prisma.question.findMany({
      where: keyword ? {
        question: {
          contains: keyword
        }
      } : {}
    });

    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/questions/:qId
// return specific question based on ID from database
router.get("/:qId", async (req, res) => {
  try {
    const qId = Number(req.params.qId);

    // searching for a unique record with the primary key
    const question = await prisma.question.findUnique({
      where: { id: qId }
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    res.json(question);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PROTECTED ROUTE, login required
router.use(authenticate);

// POST /api/questions
// create a new question in the database
router.post("/", async (req, res) => {
  try {
    const { question, answer } = req.body;

    // check if both fields exist
    if (!question || !answer) {
      return res.status(400).json({
        message: "Both question and answer are required"
      });
    }

    // create new question
    const newQuestion = await prisma.question.create({
      data: {
        question,
        answer,
        userId: req.user.userId // get user id from token 
      }
    });

    res.status(201).json(newQuestion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/questions/:qId
// edit an existing question in the database
// isOwner checks whether you are the creator
router.put("/:qId", isOwner, async (req, res) => {
  try {
    const qId = Number(req.params.qId);
    const { question, answer } = req.body;

    // check if the new data is given
    if (!question || !answer) {
      return res.status(400).json({ message: "Both question and answer are required" });
    }

    // update question and answer fields
    const updatedQuestion = await prisma.question.update({
      where: { id: qId },
      data: {
        question,
        answer
      }
    });

    res.json(updatedQuestion);
  } catch (error) {
    // error if question is not found
    if (error.code === 'P2025') {
      return res.status(404).json({ message: "Question not found" });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/questions/:qId
// delete a question from the database
// isOwner checks whether you are the creator
router.delete("/:qId", isOwner, async (req, res) => {
  try {
    const qId = Number(req.params.qId);

    // remove the question 
    const deletedQuestion = await prisma.question.delete({
      where: { id: qId }
    });

    res.json({
      message: "Question deleted successfully",
      question: deletedQuestion
    });
  } catch (error) {
    // handle case where question is not found
    if (error.code === 'P2025') {
      return res.status(404).json({ message: "Question not found" });
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;