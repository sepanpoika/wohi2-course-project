const express = require("express");
const router = require("express").Router();
const prisma = require("../lib/prisma"); 
const multer = require("multer");
const path = require("path");
const { ValidationError, NotFoundError } = require("../lib/errors");
const { z } = require("zod");

// defining Zod
const QuestionInput = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium")
});

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
    else cb(new ValidationError("Only image files are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// import the middlewares 
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");

// GET /api/questions 
// updated: added difficulty levels
router.get("/", async (req, res, next) => {
  try {
    const { keyword, difficulty } = req.query;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));
    const skip = (page - 1) * limit;

    const userId = req.user?.userId;

    const where = {
      ...(keyword ? { question: { contains: keyword } } : {}),
      ...(difficulty ? { difficulty: difficulty } : {})
    };

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
      prisma.question.count({ where })
    ]);

    res.json({
      data: questions.map(formatQuestion),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/questions/random
router.get("/random", async (req, res, next) => {
  try {
    const allQuestions = await prisma.question.findMany();
    const shuffled = allQuestions.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 10);
    res.json(selected);
  } catch (error) {
    next(error);
  }
});

// GET /api/questions/:qId
router.get("/:qId", async (req, res, next) => {
  try {
    const qId = Number(req.params.qId);
    const userId = req.user?.userId;

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
      throw new NotFoundError("Question not found");
    }

    res.json(formatQuestion(question));
  } catch (error) {
    next(error);
  }
});

// PROTECTED ROUTE, login required
router.use(authenticate);

router.post("/:qId/like", async (req, res, next) => {
  try {
    const qId = Number(req.params.qId);
    const userId = req.user.userId;

    const question = await prisma.question.findUnique({ where: { id: qId } });
    if (!question) {
      throw new NotFoundError("Question not found");
    }

    const like = await prisma.like.upsert({
      where: { userId_postId: { userId, postId: qId } },
      update: {},
      create: { userId, postId: qId },
    });

    const likeCount = await prisma.like.count({ where: { postId: qId } });
    res.status(201).json({ id: like.id, postId: qId, liked: true, likeCount, createdAt: like.createdAt });
  } catch (error) {
    next(error);
  }
});

router.delete("/:qId/like", async (req, res, next) => {
  try {
    const qId = Number(req.params.qId);
    const userId = req.user.userId;

    const question = await prisma.question.findUnique({ where: { id: qId } });
    if (!question) {
      throw new NotFoundError("Question not found");
    }

    await prisma.like.deleteMany({ where: { userId, postId: qId } });
    const likeCount = await prisma.like.count({ where: { postId: qId } });
    res.json({ postId: qId, liked: false, likeCount });
  } catch (error) {
    next(error);
  }
});

router.post("/:qId/play", async (req, res, next) => {
  try {
    const qId = Number(req.params.qId);
    const userId = req.user.userId;
    const submittedAnswer = req.body.submittedAnswer || req.body.answer;

    if (!submittedAnswer) {
      throw new ValidationError("submittedAnswer is required");
    }

    const question = await prisma.question.findUnique({ where: { id: qId } });
    if (!question) {
      throw new NotFoundError("Question not found");
    }

    const isCorrect = question.answer.trim().toLowerCase() === submittedAnswer.trim().toLowerCase();

    const attempt = await prisma.attempt.create({
      data: { questionId: qId, userId: userId, submittedAnswer: submittedAnswer, correct: isCorrect }
    });

    res.status(201).json({ id: attempt.id, correct: attempt.correct, submittedAnswer: attempt.submittedAnswer, correctAnswer: question.answer, createdAt: attempt.createdAt });
  } catch (error) {
    next(error);
  }
});

// POST /api/questions
router.post("/", upload.single("image"), async (req, res, next) => {
  try {
    const data = QuestionInput.parse(req.body); 
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const newQuestion = await prisma.question.create({
      data: {
        question: data.question,
        answer: data.answer,
        difficulty: data.difficulty,
        imageUrl,
        userId: req.user.userId 
      }
    });

    res.status(201).json(newQuestion);
  } catch (error) {
    next(error);
  }
});

// PUT /api/questions/:qId
router.put("/:qId", isOwner, upload.single("image"), async (req, res, next) => {
  try {
    const qId = Number(req.params.qId);
    const parsedBody = QuestionInput.parse(req.body);

    const data = { question: parsedBody.question, answer: parsedBody.answer, difficulty: parsedBody.difficulty };
    if (req.file) {
      data.imageUrl = `/uploads/${req.file.filename}`;
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: qId },
      data
    });

    res.json(updatedQuestion);
  } catch (error) {
    if (error.code === 'P2025') {
      next(new NotFoundError("Question not found"));
    } else {
      next(error);
    }
  }
});

router.delete("/:qId", isOwner, async (req, res, next) => {
  try {
    const qId = Number(req.params.qId);
    const deletedQuestion = await prisma.question.delete({ where: { id: qId } });
    res.json({ message: "Question deleted successfully", question: deletedQuestion });
  } catch (error) {
    if (error.code === 'P2025') {
      next(new NotFoundError("Question not found"));
    } else {
      next(error);
    }
  }
});

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

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err?.message === "Only image files are allowed") {
    next(new ValidationError(err.message));
  } else {
    next(err); 
  }
});

module.exports = router;