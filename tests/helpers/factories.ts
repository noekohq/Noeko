import { User } from "../../app/database/models/user";
import TourGuide from "../../app/services/TourGuide";
import { generateToken } from "../../app/utils/crypto";
import { getDatabase } from "../../app/database/db";
import { StringRecordId } from "surrealdb";

/**
 * Creates a test user.
 * If overrides.id is provided, it uses that specific RecordId.
 */
export const createUser = async (overrides: any = {}) => {
  const db = await getDatabase();
  const email = overrides.email || `test-${Bun.randomUUIDv7()}@example.com`;
  
  const userData = {
    firstName: "Test",
    lastName: "User",
    email,
    password: "password123",
    scratchpadContent: "",
    acceptedTermsOfServiceAt: new Date(),
    acceptedPrivacyPolicyAt: new Date(),
    settings: { isNew: true },
    roles: [new StringRecordId("role:user")],
    createdAt: new Date(),
    updatedAt: new Date(),
    disabled: false,
    ...overrides,
  };

  const id = overrides.id || "user"; // "user" will result in a generated ID

  const result = await db?.create(id, userData);
  
  if (!result) {
    throw new Error("Failed to create test user");
  }
  
  const user = Array.isArray(result) ? result[0] : result;
  return user;
};

/**
 * Seeds a user with the default onboarding data (ideas, tasks, tags).
 */
export const seedUserOnboarding = async (userId: string) => {
  const guide = new TourGuide({ userId });
  await guide.loadOnboarding();
};

/**
 * Generates a valid Bearer auth token for a user.
 * Note: If crypto is mocked globally, this will use the mock.
 */
export const getAuthToken = (user: { id: any; email: string }) => {
  const token = generateToken({
    id: user.id.toString(),
    email: user.email,
  });
  return `Bearer ${token}`;
};
