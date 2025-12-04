const request = require("supertest");
const app = require("../../src/app");

test("Health check returns status UP", async () => {
  const res = await request(app).get("/health");
  expect(res.body.status).toBe("UP");
});
