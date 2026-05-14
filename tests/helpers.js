const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

// emptying database before tests
async function resetDb() {
  await prisma.attempt.deleteMany();
  await prisma.like.deleteMany();
  await prisma.question.deleteMany();
  await prisma.user.deleteMany();
}

// registering and signing in, returning token
async function registerAndLogin(email = "a@test.io", name = "A") {
  await request(app).post("/api/auth/register")
    .send({ email, password: "pw12345", name });
    
  const res = await request(app).post("/api/auth/login")
    .send({ email, password: "pw12345" });
    
  return res.body.token;
}

// create new test question
async function createQuestion(token, overrides = {}) {
  const res = await request(app).post("/api/questions")
    .set("Authorization", `Bearer ${token}`)
    .send({ question: "Test Question?", answer: "Test Answer", ...overrides });
    
  return res.body;
}

module.exports = { resetDb, registerAndLogin, createQuestion }; 