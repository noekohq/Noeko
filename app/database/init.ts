import { seedRoles } from "./seeders/roles";
import { seedUsers } from "./seeders/users";

export const seedDatabase = async () => {
  try {
    await seedRoles();
    await seedUsers();
    console.info("Database initialized");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
};
