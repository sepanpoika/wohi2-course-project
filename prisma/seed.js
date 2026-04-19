const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // empty table before adding new data to avoid duplicates
  await prisma.question.deleteMany();

  const seedQuestions = [
    {
      question: "What is the capital of Finland",
      answer: "Helsinki",
    },
    {
      question: "What is the largest ocean in the world",
      answer: "The Pacific Ocean",
    },
    {
      question: "Who was the second man on the moon?",
      answer: "Buzz Aldrin",
    },
  ];

  for (const q of seedQuestions) {
    await prisma.question.create({
      data: q,
    });
  }

  console.log("Seed data inserted successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });