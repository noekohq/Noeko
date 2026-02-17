// Load test environment variables BEFORE any other imports
import { config } from "dotenv";
config({ path: ".env.test" });

import { mock } from "bun:test";
import { beforeAll, vi } from "vitest";
import { StringRecordId } from "surrealdb";

process.env.GEMINI_API_KEY = "mock-api-key";
process.env.GCP_PROJECT_ID = "";
process.env.TOKEN_SECRET = "test-secret";

// Global mocks
vi.mock("../app/utils/crypto", () => ({
  hashPassword: vi.fn(async (password: string) => `hashed_${password}`),
  getRandomPassword: vi.fn((length = 12) => "random_password"),
  verifyPassword: vi.fn(
    async (password: string, hashedPassword: string) => password === hashedPassword
  ),
  generateToken: vi.fn((payload: any) => `token_${JSON.stringify(payload)}`),
  verifyToken: vi.fn(async (token: string) => ({
    id: "user:test",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  })),
}));

vi.mock("../app/emails/types", () => ({
  invitationTemplate: vi.fn(() => ({ subject: "Test", html: "<p>Test</p>", text: "Test" })),
  passwordResetTemplate: vi.fn(() => ({ subject: "Reset", html: "<p>Reset</p>", text: "Reset" })),
}));

mock.module("../app/utils/mailbaby", () => ({
  mailbaby: {
    post: () => Promise.resolve({ data: {} }),
    defaults: { headers: { common: {} } },
  },
  MailBabyService: class {
    async verifyConnection() {
      return true;
    }
    get transporter() {
      return {
        verify: () => Promise.resolve(true),
        sendMail: () => Promise.resolve({ data: {} }),
      };
    }
  },
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
import { createUser, seedUserOnboarding, getAuthToken } from "./helpers/factories";
import { setGlobalToken, MOCK_USER_ID, MOCK_USER_EMAIL } from "./helpers/context";
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

/**
 * Global Initialization Logic
 * Wipes and seeds the database ONCE per test run.
 */
const initializeTestSession = async () => {
  // Check if session is already initialized by looking for our mock user
  const [userExists] = await db.query<[boolean]>(`count(SELECT id FROM user WHERE id = $id) > 0`, {
    id: new StringRecordId(MOCK_USER_ID),
  });

  if (!userExists) {
    console.info("Initializing global test session (Wipe & Seed)...");

    // 1. Wipe
    for (const table of tablesToTruncate) {
      await db.query(`DELETE ${table}`);
    }

    // 2. Seed User
    await createUser({
      id: new StringRecordId(MOCK_USER_ID),
      email: MOCK_USER_EMAIL,
    });

    // 3. Seed Onboarding Data
    await seedUserOnboarding(MOCK_USER_ID);

    console.info("Global test session initialized ✅");
  }

  // Always set the global token in the context singleton for the current process
  const token = getAuthToken({ id: MOCK_USER_ID, email: MOCK_USER_EMAIL });
  setGlobalToken(token.replace("Bearer ", ""));
};

// Execute initialization
await initializeTestSession();

beforeAll(async () => {
  await initServices();
});
