import { hashPassword } from "../../utils/crypto";
import { Role, User } from "../models/user";

const dumpUserAuth = async (user: { email: string; password: string }) => {
  Bun.write(`./auth/${user.email}`, JSON.stringify(user));
};

const randomString = (length: number) => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const { DEFAULT_SUPERUSERS } = process.env;

export const seedUsers = async () => {
  if (!DEFAULT_SUPERUSERS) {
    return false;
  }

  try {
    const users = DEFAULT_SUPERUSERS.split(",").map((s) => {
      return s.trim().toLowerCase();
    });
    users.forEach(async (user) => {
      console.info(`Seeding superuser: ${user}`);
      const foundUser = await User.findByEmail(user);
      const exists = !!foundUser;
      console.info(`Checking if user exists: `, exists);
      if (!exists) {
        console.info(`Creating user: ${user}`);
        const userPassword = randomString(10);
        await User.create(
          {
            email: user,
            firstName: "Super",
            lastName: "User",
            password: await hashPassword(userPassword),
          },
          ["role:superuser"],
        );
        await dumpUserAuth({ email: user, password: userPassword });
      } else {
        console.info(`User ${user} already exists, skipping.`);
      }
    });
  } catch (error) {
    console.error(error);
    return false;
  }
};
