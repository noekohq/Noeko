import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../db";

export type IRole = {
  id: string;
  name: string;
  description: string;
};

export type IRoleForm = Omit<IRole, "id">;

export type IUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};

export type IUserForm = Omit<IUser, "id" | "createdAt" | "updatedAt">;

export type IToken = {
  id: string;
  token: string;
  user: string;
  createdAt: Date;
  expiresAt: Date;
};

export type ITokenForm = Omit<IToken, "id">;

export class User {
  constructor() {}

  static async up() {
    try {
      const db = await getDatabase();
      await db?.query(`DEFINE TABLE IF NOT EXISTS user SCHEMAFULL;
        DEFINE FIELD firstName ON TABLE user TYPE string;
        DEFINE FIELD lastName ON TABLE user TYPE string;
        DEFINE FIELD email ON TABLE user TYPE string;
        DEFINE FIELD password ON TABLE user TYPE string;
        DEFINE FIELD createdAt ON TABLE user TYPE datetime;
        DEFINE FIELD updatedAt ON TABLE user TYPE datetime;
        DEFINE FIELD roles ON TABLE user TYPE array<record<role>>;
      `);
    } catch (error) {
      console.error("Error creating user table:", error);
      throw error;
    }
  }

  static async down() {
    try {
      const db = await getDatabase();
      await db?.query(`DROP TABLE IF EXISTS user`);
    } catch (error) {
      console.error("Error dropping user table:", error);
      throw error;
    }
  }

  static async create(form: IUserForm) {
    try {
      const db = await getDatabase();
      const result = await db?.create<
        IUser,
        IUserForm & {
          createdAt: Date;
          updatedAt: Date;
        }
      >("user", {
        ...form,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      if (!result) {
        console.error("Failed to create user");
        return undefined;
      }
      const [user] = result;
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  static async update(id: string, form: Partial<IUserForm>) {
    try {
      const db = await getDatabase();

      const updater: Partial<IUserForm> = form;

      const result = await db?.merge<
        IUser,
        Partial<IUserForm> & { updatedAt: Date }
      >(new StringRecordId(id), {
        ...updater,
        updatedAt: new Date(),
      });
      if (!result) {
        console.error("Failed to update user");
        return undefined;
      }
      return result;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  static async delete(id: string) {
    try {
      const db = await getDatabase();
      const result = await db?.delete<IUser>(new StringRecordId(id));
      if (!result) {
        console.error("Failed to delete user");
        return undefined;
      }
      const user = result;
      return user;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  static async get(id: string) {
    try {
      const db = await getDatabase();
      const result = await db?.select<IUser>(new StringRecordId(id));
      if (!result) {
        console.error("Failed to get user");
        return undefined;
      }
      const user = result;
      return user;
    } catch (error) {
      console.error("Error getting user:", error);
      throw error;
    }
  }

  static async getAll() {
    try {
      const db = await getDatabase();
      const result = await db?.select<IUser>("user");
      if (!result) {
        console.error("Failed to get user");
        return undefined;
      }
      const user = result;
      return user;
    } catch (error) {
      console.error("Error getting user:", error);
      throw error;
    }
  }
}

export class Role {
  constructor() {}

  static async up() {
    try {
      const db = await getDatabase();
      await db?.query(`DEFINE TABLE IF NOT EXISTS role SCHEMAFULL;
      DEFINE FIELD IF NOT EXISTS name ON TABLE role TYPE string;
      DEFINE FIELD IF NOT EXISTS description ON TABLE role TYPE string;
        `);
    } catch (error) {
      console.error("Error defining role schema:", error);
      throw error;
    }
  }

  static async down() {
    try {
      const db = await getDatabase();
      await db?.query(`DROP TABLE role;`);
    } catch (error) {
      console.error("Error dropping role schema:", error);
      throw error;
    }
  }

  static async create(form: IRoleForm) {
    try {
      const db = await getDatabase();
      const result = await db?.create<IRole, IRoleForm>(
        new RecordId("role", form.name),
        {
          name: form.name,
          description: form.description,
        },
      );
      if (!result) {
        console.error("Failed to create role");
        return undefined;
      }
      const role = result;
      return role;
    } catch (error) {
      console.error("Error creating role:", error);
      throw error;
    }
  }

  static async upsert(form: IRoleForm) {
    try {
      const db = await getDatabase();
      const result = await db?.upsert<IRole, IRoleForm>(
        new RecordId("role", form.name),
        {
          name: form.name,
          description: form.description,
        },
      );
      if (!result) {
        console.error("Failed to upsert role");
        return undefined;
      }
      const role = result;
      return role;
    } catch (error) {
      console.error("Error upserting role:", error);
      throw error;
    }
  }
}

export class Token {
  constructor() {}

  static async up() {
    try {
      const db = await getDatabase();
      await db?.query(`DEFINE TABLE IF NOT EXISTS token SCHEMAFULL;
      DEFINE FIELD id ON TABLE token TYPE string;
      DEFINE FIELD token ON TABLE token TYPE string;
      DEFINE FIELD createdAt ON TABLE token TYPE string;
      DEFINE FIELD expiresAt ON TABLE token TYPE string;
      DEFINE FIELD user ON TABLE token TYPE record<user>;
      `);
    } catch (error) {
      console.error("Error defining token schema:", error);
      throw error;
    }
  }

  static async create(user: IUser, token: string, expiresAt: Date) {
    try {
      const db = await getDatabase();
      const result = await db?.create<IToken, ITokenForm>("token", {
        token: token,
        user: user.id,
        createdAt: new Date(),
        expiresAt: expiresAt,
      });
      if (!result) {
        console.error("Failed to create token");
        return undefined;
      }
      const tokenRecord = result;
      return tokenRecord;
    } catch (error) {
      console.error("Error creating token:", error);
      throw error;
    }
  }

  static async findByToken(token: string) {
    try {
      const db = await getDatabase();
      const result = await db?.query<[IToken]>("token", {
        token: token,
      });
      if (!result) {
        console.error("Failed to find token");
        return undefined;
      }
      const [tokenRecord] = result;
      return tokenRecord;
    } catch (error) {
      console.error("Error finding token:", error);
      throw error;
    }
  }

  static async findByUser(user: IUser) {
    try {
      const db = await getDatabase();
      const result = await db?.query<[IToken]>("token", {
        user: user.id,
      });
      if (!result) {
        console.error("Failed to find token");
        return undefined;
      }
      const tokenRecord = result;
      return tokenRecord;
    } catch (error) {
      console.error("Error finding token:", error);
      throw error;
    }
  }

  static async get(id: string) {
    try {
      const db = await getDatabase();
      const result = await db?.select<IToken>(new RecordId("token", id));
      if (!result) {
        console.error("Failed to find token");
        return undefined;
      }
      const tokenRecord = result;
      return tokenRecord;
    } catch (error) {
      console.error("Error finding token:", error);
      throw error;
    }
  }
}
