const bcrypt = require("bcrypt");
const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");
const { resetDb } = require("./helpers");

beforeEach(resetDb);

describe("Auth tests", () => {
  it("registers, hashes the password, returns a token", async () => {
    const res = await request(app).post("/api/auth/register")
      .send({ email: "a@test.io", password: "pw12345", name: "A" });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));

    const user = await prisma.user.findUnique({ where: { email: "a@test.io" } });
    expect(user.password).not.toBe("pw12345"); // not plain
    expect(await bcrypt.compare("pw12345", user.password)).toBe(true); // valid hash
  });
});