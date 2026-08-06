import type { Migration } from "./types";

export const migration: Migration = {
  id: "20260804223500_fix_user_token_datetimes",
  description: "Store user token timestamps as native datetimes.",
  async up(db) {
    await db.query(`
      DEFINE TABLE IF NOT EXISTS user_token SCHEMAFULL;
      DEFINE FIELD OVERWRITE createdAt ON TABLE user_token TYPE any;
      DEFINE FIELD OVERWRITE expiresAt ON TABLE user_token TYPE any;

      UPDATE user_token
        SET createdAt = type::datetime(createdAt)
        WHERE type::is_string(createdAt);
      UPDATE user_token
        SET expiresAt = type::datetime(expiresAt)
        WHERE type::is_string(expiresAt);

      DEFINE FIELD OVERWRITE createdAt ON TABLE user_token TYPE datetime;
      DEFINE FIELD OVERWRITE expiresAt ON TABLE user_token TYPE datetime;
    `);
  },
  async down(db) {
    await db.query(`
      DEFINE FIELD OVERWRITE createdAt ON TABLE user_token TYPE any;
      DEFINE FIELD OVERWRITE expiresAt ON TABLE user_token TYPE any;

      UPDATE user_token
        SET createdAt = type::string(createdAt)
        WHERE type::is_datetime(createdAt);
      UPDATE user_token
        SET expiresAt = type::string(expiresAt)
        WHERE type::is_datetime(expiresAt);

      DEFINE FIELD OVERWRITE createdAt ON TABLE user_token TYPE string;
      DEFINE FIELD OVERWRITE expiresAt ON TABLE user_token TYPE string;
    `);
  },
};
