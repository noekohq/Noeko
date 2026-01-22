// Load test environment variables BEFORE any other imports
import { config } from "dotenv";
config({ path: ".env.test" });

import { mock } from "bun:test";

// Mock crypto utilities before they get imported
import { beforeAll, vi } from "vitest";

vi.mock("../app/utils/crypto", () => ({
  hashPassword: vi.fn(async (password: string) => `hashed_${password}`),
  getRandomPassword: vi.fn((length = 12) => "random_password"),
  verifyPassword: vi.fn(async (password: string, hashedPassword: string) => password === hashedPassword),
  generateToken: vi.fn((payload: any) => `token_${JSON.stringify(payload)}`),
  verifyToken: vi.fn(async (token: string) => ({ id: "test" })),
}));

vi.mock("../app/emails/types", () => ({
  invitationTemplate: vi.fn(() => ({ subject: "Test", html: "<p>Test</p>", text: "Test" })),
}));

mock.module("../app/utils/mailbaby", () => ({
  mailbaby: {
    post: () => Promise.resolve({ data: {} }),
    defaults: { headers: { common: {} } },
  },
  MailBabyService: class {
    verifyConnection() { return Promise.resolve(true); }
    get transporter() {
      return {
        verify: () => Promise.resolve(true),
        sendMail: () => Promise.resolve({ data: {} })
      };
    }
  }
}));

mock.module("../app/utils/aws/s3", () => ({
  writeToS3: () => Promise.resolve({ written: 0, completed: true }),
  deleteFromS3: () => Promise.resolve(true),
  existsS3: () => Promise.resolve(true),
  downloadLinkS3: () => Promise.resolve("http://localhost/test-file"),
  getStreamS3: () => null,
}));

import { getDatabase } from "../app/database/db";
import { initServices } from "../app/services";
import "@testing-library/jest-dom/vitest";

const db = await getDatabase();

if (!db) {
  throw new Error("Couldn't get database for testing purposes!");
}

const tablesToTruncate = [
  "user",
  "idea",
  "task",
  "connected",
  "describes",
  "tag",
  "feature",
  "import",
  "imported",
  "includes",
  "initiated_import",
  "log",
  "onboarded_to",
  "owns",
  "pins",
  "rabbithole",
  "referred",
  "role",
  "shared_with",
  "source",
  "spyglass_record",
  "user_token",
];

beforeAll(async () => {
  for (const table of tablesToTruncate) {
    await db.query(`DELETE ${table}`);
  }
  await initServices();
});
