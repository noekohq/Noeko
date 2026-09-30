import { User, Role, Token } from "./user";
import { Idea } from "./ideas";
import { UserFile } from "./userfile";
import { Import } from "./import";
import { Tag } from "./tag";
import { Log } from "./log";
import { SpyglassSearch } from "./search";
import Rabbithole from "./rabbithole";
import Task from "./task";
import Source from "./source";
import Excerpt from "./excerpt";
import { getDatabase } from "../db";

export const modelsUp = async () => {
  try {
    console.info("Running model up functions.");
    await User.up();
    await Role.up();
    await Token.up();
    await Idea.up();
    await UserFile.up();
    await Import.up();
    await Tag.up();
    await Log.up();
    await SpyglassSearch.up();
    await Rabbithole.up();
    await Task.up();
    await Source.up();
    await Excerpt.up();

    // SurrealDB v3 errors when a query targets a table that has never been
    // defined. Some tables used to be created lazily by their first write, so
    // define the complete query surface after model-specific schemas run.
    const db = await getDatabase();
    if (!db) {
      throw new Error("Couldn't get database while ensuring model tables.");
    }
    await db.query(`
      DEFINE TABLE IF NOT EXISTS user SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS idea SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS task SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS connected SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS describes SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS tag SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS feature SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS import SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS embedded_within SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS excerpt SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS feedback SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS imported SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS includes SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS initiated_import SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS log SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS onboarded_to SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS owns SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS pins SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS rabbithole SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS rabbithole_evaluation_job SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS referred SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS role SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS shared_with SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS source SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS spyglass_record SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS spyglass_run_event SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS spyglass_run SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS user_file SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS user_token SCHEMALESS;
    `);
  } catch (error) {
    console.error("There was an error updating models: ", error);
  }
};
