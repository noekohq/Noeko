process.env.DB_HOST = "localhost"; // Otherwise it connects over docker

import { User } from "../app/database/models/user";
import chalk from "chalk";
import { writeFileSync } from "fs";
import path from "path";

async function run() {
  console.info(chalk.blue("Starting user export to CSV..."));

  try {
    const users = await User.getAll();
    if (!users || users.length === 0) {
      console.error(chalk.red("No users found to export."));
      process.exit(1);
    }

    console.info(`Fetched ${chalk.green(users.length)} users.`);

    const headers = [
      "ID",
      "First Name",
      "Last Name",
      "Email",
      "Created At",
      "Disabled",
      "Referral Code",
      "Num Ideas",
    ];

    const rows = users.map((user: any) => [
      user.id,
      user.firstName,
      user.lastName,
      user.email,
      user.createdAt,
      user.disabled,
      user.referralCode || "",
      user.numIdeas || 0,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const fileName = `users-export-${new Date().toISOString().split("T")[0]}.csv`;
    const filePath = path.join(process.cwd(), fileName);

    writeFileSync(filePath, csvContent);

    console.info(`${chalk.blue("Export complete!")} File saved to: ${chalk.green.bold(filePath)}`);
    process.exit(0);
  } catch (error) {
    console.error(chalk.red("There was an error exporting the users:"), error);
    process.exit(1);
  }
}

run();
