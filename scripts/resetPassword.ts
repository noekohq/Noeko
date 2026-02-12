process.env.DB_HOST = "localhost"; // Otherwise it connects over docker

import { User } from "../app/database/models/user";
import { getRandomPassword, hashPassword } from "../app/utils/crypto";
import { parseArgs } from "util";
import chalk from "chalk";

if (!User) {
  throw new Error("Something went wrong getting the user model!");
}

const { values } = parseArgs({
  args: Bun.argv.slice(2),
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

if (values.help || !values.email) {
  console.info("Usage: bun resetPassword.ts --email <email>; bun resetPassword.ts -e <email>");
  console.info("Example: bun resetPassword.ts user@example.com");
  process.exit(0);
}

const { email } = values;
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
