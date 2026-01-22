import { Role } from "../models/user";
import { IRole } from "../../../shared/types/user";

const initialRoles: IRole[] = [
  {
    id: "role:superuser",
    name: "superuser",
    description: "Superuser role.",
  },
  {
    id: "role:user",
    name: "user",
    description: "User role.",
  },
];

export const seedRoles = async () => {
  try {
    console.info("Seeding roles...");
    await Role.up();
    for (const role of initialRoles) {
      console.info(`Upserting role ${role.name}...`);
      await Role.upsert(role);
      console.info("Upserted");
    }
  } catch (error) {
    console.error("Error seeding roles:", error);
  }
};
