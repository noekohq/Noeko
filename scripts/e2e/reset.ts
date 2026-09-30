import { closeDatabaseConnection, getDatabase, initDatabase } from "../../app/database/db";
import { User } from "../../app/database/models/user";
import Feature from "../../app/database/models/feature";
import { hashPassword } from "../../app/utils/crypto";
import { E2E_USER } from "../../e2e/support/constants";

const databaseName = process.env.DB_DATABASE;

if (!databaseName?.endsWith("_test")) {
  throw new Error(
    `Refusing to reset database "${databaseName ?? "<undefined>"}". E2E databases must end in "_test".`
  );
}

const resettableTables = [
  "connected",
  "describes",
  "excerpt",
  "feedback",
  "file",
  "idea",
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
  "searched",
  "shared_with",
  "source",
  "spyglass_record",
  "tag",
  "task",
  "user_token",
  "userfile",
  "user",
] as const;

const initializeWithRetry = async () => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await initDatabase();
      return;
    } catch (error) {
      lastError = error;
      await Bun.sleep(250);
    }
  }

  throw lastError;
};

try {
  await initializeWithRetry();
  const db = await getDatabase();

  if (!db) {
    throw new Error("Could not connect to the E2E database.");
  }

  for (const table of resettableTables) {
    await db.query(`DELETE ${table}`);
  }

  const user = await User.create({
    email: E2E_USER.email,
    firstName: E2E_USER.firstName,
    lastName: E2E_USER.lastName,
    password: await hashPassword(E2E_USER.password),
    scratchpadContent: "",
    acceptedTermsOfServiceAt: new Date(),
    acceptedPrivacyPolicyAt: new Date(),
    settings: {
      isNew: false,
    },
  });

  if (!user) {
    throw new Error("Could not seed the E2E user.");
  }

  await User.update(user.id.toString(), {
    settings: {
      ...user.settings,
      isNew: false,
    },
  });

  const features = await db.select<{ id: string }>("feature");
  for (const feature of features) {
    await new Feature(feature.id).viewedBy(user.id);
  }
} finally {
  await closeDatabaseConnection();
}
