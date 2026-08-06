import { parseArgs } from "node:util";
import { closeDatabaseConnection, getDatabase } from "../app/database/db";

type Policy = "tos" | "privacy" | "both";

type PolicyAcceptance = {
  id: { toString(): string };
  email: string;
  acceptedTermsOfServiceAt?: Date | null;
  acceptedPrivacyPolicyAt?: Date | null;
};

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    help: {
      type: "boolean",
      short: "h",
    },
    email: {
      type: "string",
      short: "e",
      multiple: true,
    },
    policy: {
      type: "string",
      short: "p",
      default: "both",
    },
    all: {
      type: "boolean",
    },
    yes: {
      type: "boolean",
      short: "y",
    },
    "dry-run": {
      type: "boolean",
    },
  },
});

const printHelp = () => {
  console.info(`Reset users' legal-policy acceptance timestamps.

Usage:
  bun run policy:reset --email user@example.com
  bun run policy:reset --email first@example.com --email second@example.com
  bun run policy:reset first@example.com second@example.com --policy privacy
  bun run policy:reset --all --yes --policy both

Options:
  -e, --email <email>       Select an email; may be repeated or comma-separated
  -p, --policy <policy>     tos, privacy, or both (default: both)
      --all                 Select every user
  -y, --yes                 Required when updating every user
      --dry-run             Show matching users without updating them
  -h, --help                Show this help

Examples:
  bun run policy:reset -e aidan@noeko.app --dry-run
  bun run policy:reset -e aidan@noeko.app --policy tos
  bun run policy:reset --all --yes --policy both`);
};

const parseEmails = () => {
  const emailArguments = [...(values.email ?? []), ...positionals];
  return [
    ...new Set(
      emailArguments
        .flatMap((argument) => argument.split(","))
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
};

const formatAcceptance = (value: Date | string | null | undefined) => {
  if (!value) return "not accepted";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
};

const printUsers = (users: PolicyAcceptance[]) => {
  for (const user of users) {
    console.info(
      `- ${user.email} (${user.id.toString()}): ` +
        `ToS=${formatAcceptance(user.acceptedTermsOfServiceAt)}, ` +
        `Privacy=${formatAcceptance(user.acceptedPrivacyPolicyAt)}`
    );
  }
};

if (values.help) {
  printHelp();
  process.exit(0);
}

const policy = values.policy as Policy;
if (!(["tos", "privacy", "both"] as const).includes(policy)) {
  console.error(`Unknown policy "${values.policy}". Expected tos, privacy, or both.`);
  process.exit(1);
}

const emails = parseEmails();
if (values.all && emails.length > 0) {
  console.error("Use either --all or one or more email addresses, not both.");
  process.exit(1);
}

if (!values.all && emails.length === 0) {
  console.error("Provide at least one email address, or use --all. Run with --help for usage.");
  process.exit(1);
}

if (values.all && !values["dry-run"] && !values.yes) {
  console.error("Resetting every user requires --yes. Use --dry-run to preview the scope safely.");
  process.exit(1);
}

const selectedFields = `
  id,
  email,
  acceptedTermsOfServiceAt,
  acceptedPrivacyPolicyAt
`;

const whereClause = values.all ? "" : "WHERE email IN $emails";
const queryVariables = values.all ? undefined : { emails };

try {
  const db = await getDatabase();
  if (!db) {
    throw new Error("Could not connect to the database.");
  }

  const [matchedUsers] = await db.query<[PolicyAcceptance[]]>(
    `SELECT ${selectedFields} FROM user ${whereClause} ORDER BY email ASC;`,
    queryVariables
  );

  if (matchedUsers.length === 0) {
    console.error("No users matched the requested scope.");
    process.exitCode = 1;
  } else {
    console.info(`Matched ${matchedUsers.length} user${matchedUsers.length === 1 ? "" : "s"}:`);
    printUsers(matchedUsers);

    const missingEmails = values.all
      ? []
      : emails.filter((email) => !matchedUsers.some((user) => user.email.toLowerCase() === email));
    if (missingEmails.length > 0) {
      console.warn(`No user found for: ${missingEmails.join(", ")}`);
    }

    if (values["dry-run"]) {
      console.info(`Dry run complete. No ${policy} acceptance timestamps were changed.`);
    } else {
      const assignments = {
        tos: "acceptedTermsOfServiceAt = NONE",
        privacy: "acceptedPrivacyPolicyAt = NONE",
        both: "acceptedTermsOfServiceAt = NONE, acceptedPrivacyPolicyAt = NONE",
      }[policy];

      const [updatedUsers] = await db.query<[PolicyAcceptance[]]>(
        `UPDATE user SET ${assignments} ${whereClause} RETURN ${selectedFields};`,
        queryVariables
      );

      console.info(
        `Reset ${policy} acceptance for ${updatedUsers.length} user${updatedUsers.length === 1 ? "" : "s"}:`
      );
      printUsers(updatedUsers.sort((a, b) => a.email.localeCompare(b.email)));
    }
  }
} catch (error) {
  console.error("Policy acceptance reset failed:", error);
  process.exitCode = 1;
} finally {
  await closeDatabaseConnection();
}
