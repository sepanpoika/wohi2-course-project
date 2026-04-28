const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

async function main() {
  // empty table before adding new data to avoid duplicates
  await prisma.question.deleteMany();
  await prisma.user.deleteMany();

  // creating test user and encrypting password
  const hashedPassword = await bcrypt.hash("1234", 10);
  
  const user = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: hashedPassword,
      name: "Admin User",
    },
  }); 

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

  // creating questions and joining them to the user
  for (const q of seedQuestions) {
    await prisma.question.create({
      data: {
        question: q.question,
        answer: q.answer,
        userId: user.id,
      },
    });
  }

  console.log("Created user:", user.email);
  console.log("Seeded database with 3 questions");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });