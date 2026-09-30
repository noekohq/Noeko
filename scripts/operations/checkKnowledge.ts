process.env.DB_HOST = "localhost"; // Otherwise it connects over docker

import { getDatabase } from "../../app/database/db";

async function checkKnowledge() {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error("Couldn't connect to database");
    }
    const [results] = await db.query(``);
  } catch (error) {
    console.error("Error checking knowledge artifacts");
  }
}

checkKnowledge();
