const express = require("express");
const router = require("express").Router();
const prisma = require("../lib/prisma"); 
const multer = require("multer");
const path = require("path");

// storage setup for images
const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "..", "public", "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});

// multer upload middleware
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// import the middlewares 
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");

// GET /api/questions 
// list all questions OR search by keyword from database with pagination
router.get("/", async (req, res) => {
  try {
    const { keyword } = req.query;

    // pagination parameters
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));
    const skip = (page - 1) * limit;

    const userId = req.user?.userId;

    const where = keyword ? {
      question: {
        contains: keyword
      }
    } : {};

    // fetch current page and total count
    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        include: { 
          user: true,
          likes: { where: { userId }, take: 1 },
          attempts: { where: { userId, correct: true }, take: 1 },
          _count: { select: { likes: true } }
        },
        orderBy: { id: "asc" },
        skip,
        take: limit,
      }),
      prisma.question.count({ where }) // count total records
    ]);

    // return data
    res.json({
      data: questions.map(formatQuestion),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/questions/:qId
// return specific question based on ID from database
router.get("/:qId", async (req, res) => {
  try {
    const qId = Number(req.params.qId);
    const userId = req.user?.userId;

    // unique record searching
    const question = await prisma.question.findUnique({
      where: { id: qId },
      include: { 
        user: true,
        likes: { where: { userId }, take: 1 },
        attempts: { where: { userId, correct: true }, take: 1 },
        _count: { select: { likes: true } }
      }
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    res.json(formatQuestion(question));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PROTECTED ROUTE, login required
router.use(authenticate);

// POST /api/questions/:qId/like
// like a question
router.post("/:qId/like", async (req, res) => {
  try {
    const qId = Number(req.params.qId);
    const userId = req.user.userId;

    const question = await prisma.question.findUnique({ where: { id: qId } });
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const like = await prisma.like.upsert({
      where: { userId_postId: { userId, postId: qId } },
      update: {},
      create: { userId, postId: qId },
    });

    const likeCount = await prisma.like.count({ where: { postId: qId } });
    res.status(201).json({
      id: like.id,
      postId: qId,
      liked: true,
      likeCount,
      createdAt: like.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/questions/:qId/like
// unlike a question
router.delete("/:qId/like", async (req, res) => {
  try {
    const qId = Number(req.params.qId);
    const userId = req.user.userId;

    const question = await prisma.question.findUnique({ where: { id: qId } });
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // deleteMany doesn't error if no like exists
    await prisma.like.deleteMany({
      where: { userId, postId: qId },
    });

    const likeCount = await prisma.like.count({ where: { postId: qId } });
    res.json({ postId: qId, liked: false, likeCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/questions/:qId/play
// submit an answer to a question and save the attempt
router.post("/:qId/play", async (req, res) => {
  try {
    const qId = Number(req.params.qId);
    const userId = req.user.userId;
    
    // fallback if frontend sends answer instead of submittedAnswer
    const submittedAnswer = req.body.submittedAnswer || req.body.answer;

    if (!submittedAnswer) {
      return res.status(400).json({ message: "submittedAnswer is required" });
    }

    const question = await prisma.question.findUnique({ where: { id: qId } });
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // check if correct
    const isCorrect = question.answer.trim().toLowerCase() === submittedAnswer.trim().toLowerCase();

    // reate attempt record
    const attempt = await prisma.attempt.create({
      data: {
        questionId: qId,
        userId: userId,
        submittedAnswer: submittedAnswer,
        correct: isCorrect
      }
    });

    res.status(201).json({
      id: attempt.id,
      correct: attempt.correct,
      submittedAnswer: attempt.submittedAnswer,
      correctAnswer: question.answer,
      createdAt: attempt.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/questions
// create a new question in the database
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { question, answer } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

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
        imageUrl,
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
router.put("/:qId", isOwner, upload.single("image"), async (req, res) => {
  try {
    const qId = Number(req.params.qId);
    const { question, answer } = req.body;

    // check if the new data is given
    if (!question || !answer) {
      return res.status(400).json({ message: "Both question and answer are required" });
    }

    const data = { question, answer };
    if (req.file) {
      data.imageUrl = `/uploads/${req.file.filename}`;
    }

    // update question and answer fields
    const updatedQuestion = await prisma.question.update({
      where: { id: qId },
      data
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

// function to format question response
function formatQuestion(question) {
  return {
    ...question,
    userName: question.user?.name || null,
    likeCount: question._count?.likes ?? 0,
    liked: question.likes ? question.likes.length > 0 : false,
    solved: question.attempts ? question.attempts.length > 0 : false,
    user: undefined,
    likes: undefined,
    attempts: undefined,
    _count: undefined
  };
}

// multer error handling middleware 
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err?.message === "Only image files are allowed") {
    return res.status(400).json({ msg: err.message });
  }
  next(err);
});

module.exports = router;