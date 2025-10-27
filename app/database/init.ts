import { seedRoles } from "./seeders/roles";
import { seedUsers } from "./seeders/users";
import { seedFeatures } from "./seeders/features";
import { modelsUp } from "./models";

export const seedDatabase = async () => {
  try {
    await modelsUp();
    await seedRoles();
    await seedUsers();
    await seedFeatures();
    console.info("Database initialized");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
};
