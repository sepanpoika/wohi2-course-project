const prisma = require("../lib/prisma");

async function isOwner(req, res, next) {
  const qId = Number(req.params.qId);
  const question = await prisma.question.findUnique({
    where: { id: qId },
  });

  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  // comparing the userId 
  if (question.userId !== req.user.userId) {
    return res.status(403).json({ error: "You can only modify your own questions" });
  }

  // saving the question for reusability
  req.question = question;
  next();
}

module.exports = isOwner;