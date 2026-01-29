import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../app/index";

describe("Auth Router", () => {
  describe("POST /api/users/register", () => {
    it("Doesn't allow global registration yet", async () => {
      const response = await request(app).post("/api/users/register").send({
        firstName: "Test",
        lastName: "Testner",
        email: "test@gmail.com",
        password: "jellyfish",
        passwordConfirmation: "jellyfish",
      });

      expect(response.status).toBe(403);
    });
  });

  describe("POST /api/users/register-referred", () => {
    it("Rejects an improper registration code", async () => {
      const response = await request(app)
        .post("/api/users/register-referred")
        .send({
          firstName: "Test",
          lastName: "Testner",
          email: "test@gmail.com",
          password: "jellyfish",
          passwordConfirmation: "jellyfish",
          referralCode: "gobbly-gook", // <- Not a real code
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Invalid or expired referral code.");
    });
  });
});
