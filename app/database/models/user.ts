import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../db";
import { generateToken, verifyToken } from "../../utils/crypto";

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
  password: string;
  roles: IRole[];
  createdAt: Date;
  updatedAt: Date;
};

export type IUserForm = Omit<IUser, "id" | "createdAt" | "updatedAt">;

export type IToken = {
  id: string;
  token: string;
  user: string;
  type: string;
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
        DEFINE FIELD IF NOT EXISTS firstName ON TABLE user TYPE string;
        DEFINE FIELD IF NOT EXISTS lastName ON TABLE user TYPE string;
        DEFINE FIELD IF NOT EXISTS email ON TABLE user TYPE string;
        DEFINE FIELD IF NOT EXISTS password ON TABLE user TYPE string;
        DEFINE FIELD IF NOT EXISTS createdAt ON TABLE user TYPE datetime;
        DEFINE FIELD IF NOT EXISTS updatedAt ON TABLE user TYPE datetime;
        DEFINE FIELD IF NOT EXISTS roles ON TABLE user TYPE array<record<role>>;
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

  static async create(form: IUserForm, withRoles: string[] = ["role:user"]) {
    try {
      const db = await getDatabase();
      const roles = (
        await Promise.all(withRoles.map(async (r) => Role.get(r)))
      ).filter((r) => !!r);
      const result = await db?.create<
        IUser,
        IUserForm & {
          createdAt: Date;
          updatedAt: Date;
        }
      >("user", {
        ...form,
        roles,
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

  static async findByEmail(email: string) {
    try {
      const db = await getDatabase();
      const result = await db?.query<[IUser[] | undefined]>(
        "SELECT * FROM user WHERE email = $email;",
        { email },
      );
      if (!result) {
        console.error("Failed to get user");
        return undefined;
      }
      const [users] = result;
      if (!users || users.length === 0) {
        console.error("User not found");
        return undefined;
      }
      const user = users[0];
      return user;
    } catch (error) {
      console.error("Error getting user:", error);
      throw error;
    }
  }

  static async checkUserHasRole(id: string, role: string) {
    try {
      const db = await getDatabase();
      const result = await db?.select<IUser>(new StringRecordId(id));
      if (!result) {
        console.error("Failed to get user");
        return false;
      }
      const user = result;
      const has = user.roles.find((r) => r.name === role || r.id === role);
      return has !== undefined;
    } catch (error) {
      console.error("Error getting user:", error);
      throw error;
    }
  }

  static async generateAccessToken(user: IUser) {
    try {
      const token = generateToken<IUser>(user, {
        expiresIn: "1h",
      });
      return token;
    } catch (error) {
      console.error("Error generating access token:", error);
      throw error;
    }
  }

  static async generateRefreshToken(user: IUser) {
    try {
      const token = generateToken<IUser>(user, {
        expiresIn: "7d",
      });
      await Token.create(
        user,
        token,
        "refresh",
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      );
      return token;
    } catch (error) {
      console.error("Error generating refresh token:", error);
      throw error;
    }
  }

  static async refreshAccessTokens(user: IUser, refresh: string) {
    try {
      const foundRefresh = await Token.findByToken(refresh);
      if (!foundRefresh) {
        console.error("Refresh token not found");
        return undefined;
      }
      const valid = await verifyToken<IUser>(foundRefresh.token);
      if (!valid) {
        console.error("Invalid refresh token");
        return undefined;
      }
      const token = generateToken<IUser>(user, {
        expiresIn: "1h",
      });
      return token;
    } catch (error) {
      console.error("Error generating access token:", error);
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

  static async get(id: string) {
    try {
      const db = await getDatabase();
      const result = await db?.select<IRole>(new StringRecordId(id));
      if (!result) {
        console.error("Failed to get role");
        return undefined;
      }
      const role = result;
      return role;
    } catch (error) {
      console.error("Error getting role:", error);
      throw error;
    }
  }

  static async getByName(name: string) {
    try {
      const db = await getDatabase();
      const result = await db?.query<[IRole]>(
        `SELECT * FROM role WHERE name = ${name}`,
      );
      if (!result) {
        console.error("Failed to get role");
        return undefined;
      }
      const [role] = result;
      return role;
    } catch (error) {
      console.error("Error getting role:", error);
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
      DEFINE FIELD IF NOT EXISTS id ON TABLE token TYPE string;
      DEFINE FIELD IF NOT EXISTS token ON TABLE token TYPE string;
      DEFINE FIELD IF NOT EXISTS createdAt ON TABLE token TYPE string;
      DEFINE FIELD IF NOT EXISTS expiresAt ON TABLE token TYPE string;
      DEFINE FIELD IF NOT EXISTS user ON TABLE token TYPE record<user>;
      DEFINE FIELD IF NOT EXISTS type ON TABLE token TYPE string;
      `);
    } catch (error) {
      console.error("Error defining token schema:", error);
      throw error;
    }
  }

  static async create(
    user: IUser,
    token: string,
    type: string,
    expiresAt: Date,
  ) {
    try {
      const db = await getDatabase();
      const result = await db?.create<IToken, ITokenForm>("token", {
        token: token,
        user: user.id,
        type: type,
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
