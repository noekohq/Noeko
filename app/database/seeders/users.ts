import { getDatabase } from "../db";

const { DEFAULT_SUPERUSERS } = process.env;

export const seedUsers = async () => {
  if (!DEFAULT_SUPERUSERS) {
    return false;
  }

  try {
    const users = DEFAULT_SUPERUSERS.split(",").map((s) => {
      return s.trim().toLowerCase();
    });
  } catch (error) {
    console.error(error);
    return false;
  }
};
