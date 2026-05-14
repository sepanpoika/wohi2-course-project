const prisma = require("../lib/prisma");
const { NotFoundError, ForbiddenError } = require("../lib/errors");

async function isOwner(req, res, next) {
  try {
    const qId = Number(req.params.qId);
    const question = await prisma.question.findUnique({
      where: { id: qId },
    });

    if (!question) {
      throw new NotFoundError("Question not found");
    }

    // comparing the userId 
    if (question.userId !== req.user.userId) {
      throw new ForbiddenError("You can only modify your own questions");
    }

    // saving the question for reusability
    req.question = question;
    next();
  } catch (error) {
    next(error); // error passed to index.js handler
  } 
}

module.exports = isOwner;