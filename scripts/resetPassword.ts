process.env.DB_HOST = "localhost"; // Otherwise it connects over docker

import { User } from "../app/database/models/user";
import { getRandomPassword, hashPassword } from "../app/utils/crypto";
import { parseArgs } from "node:util";
import chalk from "chalk";

if (!User) {
  throw new Error("Something went wrong getting the user model!");
}

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
    },
  },
});

const positionalEmail = positionals[0];

if (values.help) {
  console.info("Usage: bun run scripts/resetPassword.ts <email>");
  console.info("       bun run scripts/resetPassword.ts --email <email>");
  process.exit(0);
}

if (positionals.length > 1) {
  console.error("Expected one email address.");
  process.exit(1);
}

if (values.email && positionalEmail && values.email !== positionalEmail) {
  console.error("Provide the email either positionally or with --email, not both.");
  process.exit(1);
}

const email = values.email ?? positionalEmail;
if (!email) {
  console.error("An email address is required. Run with --help for usage.");
  process.exit(1);
}

console.info(`Resetting password for user ${chalk.blue(email)}...`);

try {
  const user = await User.findByEmail(email);
  if (!user) {
    console.error(`A user was not found with the email ${chalk.blue(email)}.`);
    process.exit(1);
  }
  console.info("Generating password...");
  const randomNewPassword = getRandomPassword(8);
  const hashedPassword = await hashPassword(randomNewPassword);
  const updated = await User.update(user.id, {
    password: hashedPassword,
  });
  if (!updated) {
    throw new Error("Something went wrong updating the user password.");
  }
  console.info(`${chalk.blue(email)}'s new password is: ${chalk.green.bold(randomNewPassword)}`);
} catch (error) {
  console.error("There was an error resetting the password: ", error);
}
