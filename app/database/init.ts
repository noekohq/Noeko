import { seedRoles } from "./seeders/roles";

export const seedDatabase = async () => {
  try {
    await seedRoles();
    console.info("Database initialized");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
};
