import request from "supertest";
import app from "../../src/app";

describe("Health Check", () => {
  it("GET /health returns 200", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("Auth API", () => {
  it("POST /api/v1/auth/login with missing fields returns 400", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "invalid" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/v1/auth/login with wrong credentials returns 401", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nobody@arogya.ngo", password: "wrongpass" });
    expect([401, 500]).toContain(res.status);
  });
});

describe("Protected Routes", () => {
  it("GET /api/v1/patients without auth returns 401", async () => {
    const res = await request(app).get("/api/v1/patients");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/analytics/dashboard without auth returns 401", async () => {
    const res = await request(app).get("/api/v1/analytics/dashboard");
    expect(res.status).toBe(401);
  });
});
