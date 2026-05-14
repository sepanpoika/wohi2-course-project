const request = require("supertest");
const app = require("../src/app");
const { resetDb, registerAndLogin, createQuestion } = require("./helpers");

beforeEach(resetDb);

describe("Question tests", () => {
  it("returns 401 without a token when trying to create a question", async () => {
    const res = await request(app).post("/api/questions").send({ question: "Q?", answer: "A" });
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown question", async () => {
    const res = await request(app).get("/api/questions/99999");
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Question not found");
  });

  it("returns 400 for invalid question body", async () => {
    const token = await registerAndLogin();
    const res = await request(app).post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({ question: "" });
      
    expect(res.status).toBe(400);
  });

  // creating question 
  it("creates a question when authenticated", async () => {
    const token = await registerAndLogin();
    const res = await request(app).post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({ question: "What is 1+1?", answer: "2" });

    expect(res.status).toBe(201);
    expect(res.body.question).toBe("What is 1+1?");
    expect(res.body.userId).toBeDefined();
  });

  // answering question
  it("can submit an answer to a question", async () => {
    const token = await registerAndLogin();
    const question = await createQuestion(token, { question: "Capital of Finland?", answer: "Helsinki" });

    const res = await request(app).post(`/api/questions/${question.id}/play`)
      .set("Authorization", `Bearer ${token}`)
      .send({ submittedAnswer: "helsinki" });
      
    expect(res.status).toBe(201);
    expect(res.body.correct).toBe(true);
  });

  // liking and unliking question
  it("can like and unlike a question", async () => {
    const token = await registerAndLogin();
    const question = await createQuestion(token);

    // like
    let res = await request(app).post(`/api/questions/${question.id}/like`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(201);
    expect(res.body.liked).toBe(true);
    expect(res.body.likeCount).toBe(1);

    // remove like
    res = await request(app).delete(`/api/questions/${question.id}/like`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.liked).toBe(false);
    expect(res.body.likeCount).toBe(0);
  });

  // edit and delete question
  it("can edit and delete own question", async () => {
    const token = await registerAndLogin();
    const question = await createQuestion(token, { question: "Old question", answer: "Old answer" });

    // edit
    let res = await request(app).put(`/api/questions/${question.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ question: "New question", answer: "New answer" });
    
    expect(res.status).toBe(200);
    expect(res.body.question).toBe("New question");

    // delete
    res = await request(app).delete(`/api/questions/${question.id}`)
      .set("Authorization", `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Question deleted successfully");
  });
});