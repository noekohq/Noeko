import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../db";
import { generateToken, verifyToken } from "../../utils/crypto";
import { invitationTemplate } from "../../emails/types";
import { sendEmail } from "../../utils/email";
import { Idea } from "./ideas";

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
  roles: RecordId[];
  disabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type IUserForm = Omit<
  IUser,
  "id" | "createdAt" | "updatedAt" | "roles" | "disabled"
>;

export type ISafeUser = Omit<IUser, "password">;

export type IToken = {
  id: string;
  value: string;
  user: IUser;
  type: string;
  createdAt: Date;
  expiresAt: Date;
};

export type ITokenForm = Omit<IToken, "id" | "user"> & {
  user: StringRecordId;
};

export type IComputedProperties = {
  numIdeas: number;
};

export type IComputedUser = IUser & IComputedProperties;

export type ISafeComputedUsers = ISafeUser & IComputedProperties;

export class User {
  constructor() {}

  static async up() {
    try {
      const db = await getDatabase();
      if (!db) {
        console.info("Cannot run users up due to lack of db.");
      }
      await db?.query(`DEFINE TABLE IF NOT EXISTS user SCHEMAFULL;
        DEFINE FIELD IF NOT EXISTS firstName ON TABLE user TYPE string;
        DEFINE FIELD IF NOT EXISTS lastName ON TABLE user TYPE string;
        DEFINE FIELD IF NOT EXISTS email ON TABLE user TYPE string;
        DEFINE FIELD IF NOT EXISTS password ON TABLE user TYPE string;
        DEFINE FIELD IF NOT EXISTS createdAt ON TABLE user TYPE datetime;
        DEFINE FIELD IF NOT EXISTS updatedAt ON TABLE user TYPE datetime;
        DEFINE FIELD IF NOT EXISTS roles ON TABLE user TYPE array<record<role>>;
        DEFINE FIELD IF NOT EXISTS disabled ON TABLE user TYPE bool DEFAULT false;
      `);
      await db?.query(
        `DEFINE INDEX IF NOT EXISTS userEmailIndex ON TABLE user COLUMNS email UNIQUE;`,
      );

      const getUsersFunction = () => {
        return `
        DEFINE FUNCTION OVERWRITE fn::get_users() {
          LET $users = SELECT *, count(->owns->idea) as numIdeas OMIT password FROM user;
          RETURN $users;
        }
        `;
      };

      console.info("Running get users function...");
      await db?.query(getUsersFunction());
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

  static filterSafeFields(user: IUser): ISafeUser;
  static filterSafeFields(user: IUser[]): ISafeUser[];
  static filterSafeFields(user: IUser | IUser[]): ISafeUser | ISafeUser[] {
    if (Array.isArray(user)) {
      return user.map((u) => this.filterSafeFields(u)) as ISafeUser[];
    }
    const { password, ...safeUser } = user;
    return safeUser as ISafeUser;
  }

  static async create(form: IUserForm, withRoles: string[] = ["role:user"]) {
    try {
      const db = await getDatabase();
      const result = await db?.create<
        IUser,
        IUserForm & {
          createdAt: Date;
          updatedAt: Date;
          roles: Role[];
        }
      >("user", {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        roles: withRoles.map((r) => new StringRecordId(r)),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      if (!result) {
        console.error("Failed to create user");
        return undefined;
      }
      const [user] = result;
      return this.filterSafeFields(user);
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
      const user = result;
      return this.filterSafeFields(user);
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  static async delete(id: string) {
    try {
      const db = await getDatabase();
      const deletedIdeas = await Idea.deleteUserIdeas(id);
      if (!deletedIdeas) {
        throw Error("Something went wrong deleting user ideas.");
      }
      const result = await db?.delete<IUser>(new StringRecordId(id));
      if (!result) {
        throw Error("Failed to delete user");
      }
      const user = result;
      return this.filterSafeFields(user);
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  static async get(id: string | RecordId, unsafe?: true): Promise<IUser>;
  static async get(id: string | RecordId, unsafe?: false): Promise<ISafeUser>;
  static async get(id: string | RecordId, unsafe = false) {
    try {
      const db = await getDatabase();
      const result = await db?.select<IUser>(new StringRecordId(id));
      if (!result) {
        throw Error("Failed to get user.");
      }
      const user = result;
      if (unsafe) {
        return user;
      }
      return this.filterSafeFields(user);
    } catch (error) {
      console.error("Error getting user:", error);
      throw error;
    }
  }

  static async getAll() {
    try {
      const db = await getDatabase();
      const result = await db?.run<IComputedUser[]>("fn::get_users");
      if (!result) {
        console.error("Failed to get user");
        return undefined;
      }
      const users = result;
      return this.filterSafeFields(users);
    } catch (error) {
      console.error("Error getting all users:", error);
      throw error;
    }
  }

  static async findByEmail(email: string, unsafe?: true): Promise<IUser>;
  static async findByEmail(email: string, unsafe?: false): Promise<ISafeUser>;
  static async findByEmail(email: string, unsafe = false) {
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
      if (unsafe) {
        return user;
      }
      return this.filterSafeFields(user);
    } catch (error) {
      console.error("Error getting user by email:", error);
      throw error;
    }
  }

  static async sendInvitationEmail(
    to: ISafeUser,
    sender: ISafeUser,
    invitationPassword: string,
  ) {
    try {
      const invitation = invitationTemplate(to, sender, invitationPassword);
      const worked = await sendEmail(
        to.email,
        "Invitation to join Qwest",
        invitation,
      );
      return worked;
    } catch (error) {
      console.error("Error sending invitation email: ", error);
      return undefined;
    }
  }

  static async checkUserHasRole(id: string | RecordId, role: string) {
    try {
      const result = await User.get(id);
      if (!result) {
        console.error("Failed to get user");
        return false;
      }
      const user = result;
      const has = user.roles.find(
        (r) => r.toString() === role || r.id === role,
      );
      return has !== undefined;
    } catch (error) {
      console.error("Error checking user role:", error);
      throw error;
    }
  }

  static async generateAccessToken(user: ISafeUser) {
    try {
      const token = generateToken<ISafeUser>(user, {
        expiresIn: "1hr",
      });
      return token;
    } catch (error) {
      console.error("Error generating access token:", error);
      throw error;
    }
  }

  static async generateRefreshToken(user: ISafeUser) {
    try {
      const token = generateToken<ISafeUser>(user, {
        expiresIn: "7d",
      });
      const fullUser = await User.get(user.id, true);
      if (!fullUser) {
        console.error("User not found");
        return undefined;
      }
      await Token.create(
        fullUser.id,
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

  static async refreshAccessTokens(refresh: string) {
    try {
      const foundRefresh = await Token.findByToken(refresh);
      if (!foundRefresh) {
        console.error("Refresh token not found");
        return undefined;
      }
      const valid = await verifyToken<ISafeUser>(foundRefresh.value);
      if (!valid) {
        console.error("Invalid refresh token");
        await Token.delete(foundRefresh.id);
        return undefined;
      }
      const safeUser = User.filterSafeFields(foundRefresh.user);
      const token = await User.generateAccessToken(safeUser);
      return token;
    } catch (error) {
      console.error("Error generating access token:", error);
      throw error;
    }
  }

  static async disable(id: string | RecordId) {
    try {
      const db = await getDatabase();
      const result = await db?.merge(new StringRecordId(id), {
        disabled: true,
      });
      if (!result) {
        console.error("Failed to disable token");
        return undefined;
      }
      const tokenRecord = result;
      return tokenRecord;
    } catch (error) {
      console.error("Error disabling token:", error);
      throw error;
    }
  }

  static async enable(id: string | RecordId) {
    try {
      const db = await getDatabase();
      const result = await db?.merge(new StringRecordId(id), {
        disabled: false,
      });
      if (!result) {
        console.error("Failed to enable token");
        return undefined;
      }
      const tokenRecord = result;
      return tokenRecord;
    } catch (error) {
      console.error("Error enabling token:", error);
      throw error;
    }
  }

  static async isDisabled(id: string | RecordId) {
    try {
      const db = await getDatabase();
      const result = await db?.select<ISafeUser>(new StringRecordId(id));
      if (!result) {
        console.error("Failed to find token");
        return undefined;
      }
      const disabled = result.disabled;
      return disabled;
    } catch (error) {
      console.error("Error finding token:", error);
      return true;
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
      await db?.query(`DEFINE TABLE IF NOT EXISTS user_token SCHEMAFULL;
      DEFINE FIELD IF NOT EXISTS id ON TABLE user_token TYPE string;
      DEFINE FIELD IF NOT EXISTS value ON TABLE user_token TYPE string;
      DEFINE FIELD IF NOT EXISTS createdAt ON TABLE user_token TYPE string;
      DEFINE FIELD IF NOT EXISTS expiresAt ON TABLE user_token TYPE string;
      DEFINE FIELD IF NOT EXISTS user ON TABLE user_token TYPE record<user>;
      DEFINE FIELD IF NOT EXISTS type ON TABLE user_token TYPE string;
      `);
      console.info("Defined user_token table");
    } catch (error) {
      console.error("Error defining token schema:", error);
      throw error;
    }
  }

  static async create(
    userId: string,
    token: string,
    type: string,
    expiresAt: Date,
  ) {
    try {
      const db = await getDatabase();
      const result = await db?.create<IToken, ITokenForm>("user_token", {
        value: token,
        user: new StringRecordId(userId),
        type: type,
        createdAt: new Date(),
        expiresAt: expiresAt,
      });
      if (!result) {
        console.error("Failed to create token");
        return undefined;
      }
      return result;
    } catch (error) {
      console.error("Error creating token:", error);
      throw error;
    }
  }

  static async findByToken(token: string) {
    try {
      const db = await getDatabase();
      const result = await db?.query<[IToken[]]>(
        "SELECT *, user.* FROM user_token WHERE value = $value;",
        {
          value: token,
        },
      );
      if (!result) {
        console.error("Failed to find token");
        return undefined;
      }
      const [tokenRecord] = result;
      const fullToken = tokenRecord[0];
      return fullToken;
    } catch (error) {
      console.error("Error finding token:", error);
      throw error;
    }
  }

  static async findByUser(user: IUser) {
    try {
      const db = await getDatabase();
      const result = await db?.query<[IToken[]]>(
        "SELECT * FROM user_token WHERE user = <record> $user;",
        {
          user: user.id,
        },
      );
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

  static async get(id: string | RecordId) {
    try {
      const db = await getDatabase();
      const result = await db?.select<IToken>(new StringRecordId(id));
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

  static async delete(id: string | RecordId) {
    try {
      const db = await getDatabase();
      const result = await db?.delete(new StringRecordId(id));
      if (!result) {
        console.error("Failed to delete token");
        return undefined;
      }
      const tokenRecord = result;
      return tokenRecord;
    } catch (error) {
      console.error("Error deleting token:", error);
      throw error;
    }
  }
}
