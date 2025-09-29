import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../db";
import { generateToken, verifyToken, hashPassword } from "../../utils/crypto";
import { invitationTemplate, passwordResetTemplate } from "../../emails/types";
import { sendEmail } from "../../utils/email";
import { Idea } from "./ideas";
import { getKernel } from "../../services/Kernel";
import {
  firstIdea,
  newScratchpad,
  secondIdea,
} from "../../templates/onboarding";
import { SpyglassSearch } from "./search";

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
  scratchpadContent: string;
  roles: RecordId[];
  disabled: boolean;
  referralCode?: string; // Added referral code
  acceptedTermsOfServiceAt: Date | null;
  acceptedPrivacyPolicyAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type IUserForm = Omit<
  IUser,
  "id" | "createdAt" | "updatedAt" | "roles" | "disabled" | "referralCode"
>;

export type ISafeUser = Omit<IUser, "password">;
export type IPublicUser = Omit<
  IUser,
  | "password"
  | "email"
  | "roles"
  | "disabled"
  | "referralCode"
  | "scratchpadContent"
  | "acceptedTermsOfServiceAt"
  | "acceptedPrivacyPolicyAt"
>;

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

export type IDailyActivity = {
  day: string;
  dailyCount: number;
};

export type IComputedProperties = {
  numIdeas: number;
  ideaActivity: IDailyActivity[];
  taskActivity: IDailyActivity[];
};

export type IComputedUser = IUser & IComputedProperties;

export type ISafeComputedUsers = ISafeUser & IComputedProperties;

async function ensureAllUsersHaveNecessaryFields() {
  const db = await getDatabase();
  if (!db) {
    console.info(
      "Cannot run ensureAllUsersHaveNecessaryFields due to lack of db.",
    );
    return;
  }

  const results = await db.query<[IUser[]]>(`SELECT * FROM user`);
  if (!results) {
    throw new Error("Failed to fetch users");
  }
  const [users] = results;
  let numUpdatedScratchpads = 0;
  let numUpdatedReferralCodes = 0;
  for (const user of users) {
    if (user.scratchpadContent === null) {
      await db.query(
        `UPDATE user MERGE { scratchpadContent: '' } WHERE id = ${user.id}`,
      );
      numUpdatedScratchpads++;
    }
    if (user.referralCode === null) {
      const referralCode = Bun.randomUUIDv7();
      await db.query(
        `UPDATE user MERGE { referralCode: $referralCode } WHERE id = ${user.id}`,
        {
          referralCode,
        },
      );
      numUpdatedReferralCodes++;
    }
    if (!user.acceptedPrivacyPolicyAt) {
      await db.query(
        `UPDATE user MERGE { acceptedPrivacyPolicyAt: None } WHERE id = ${user.id}`,
        {
          acceptedPrivacyPolicyAt: null,
        },
      );
    }
    if (!user.acceptedTermsOfServiceAt) {
      await db.query(
        `UPDATE user MERGE { acceptedTermsOfServiceAt: None } WHERE id = ${user.id}`,
        {
          acceptedTermsOfServiceAt: null,
        },
      );
    }
  }
  console.info(
    `Updated ${numUpdatedScratchpads} users to include scratchpad content`,
  );
  console.info(
    `Updated ${numUpdatedReferralCodes} users to include referral codes`,
  );
}

export class User {
  constructor() {}

  static async up() {
    try {
      // Ensure all users have referral codes
      console.info("Ensuring all users have referral codes...");
      // await User.ensureReferralCodes();

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
        DEFINE FIELD OVERWRITE scratchpadContent ON TABLE user TYPE option<string>;
        DEFINE FIELD OVERWRITE referralCode ON TABLE user TYPE option<string>;
        DEFINE FIELD OVERWRITE acceptedTermsOfServiceAt ON TABLE user TYPE option<datetime>;
        DEFINE FIELD OVERWRITE acceptedPrivacyPolicyAt ON TABLE user TYPE option<datetime>;
      `);
      await db?.query(
        `DEFINE INDEX IF NOT EXISTS userEmailIndex ON TABLE user COLUMNS email UNIQUE;`,
      );

      const getUsersFunction = () => {
        return `
        DEFINE FUNCTION OVERWRITE fn::get_users() {
          LET $users = SELECT
              *,
              count(->owns->idea) as numIdeas,
              (
                SELECT
                  time::floor(createdAt, 1d) AS day,
                  count() AS dailyCount
                FROM ->owns->idea
                WHERE createdAt >= time::now() - 7d
                GROUP BY day
                ORDER BY day ASC
              ) AS ideaActivity,
              (
                SELECT
                  time::floor(createdAt, 1d) AS day,
                  count() AS dailyCount
                FROM ->owns->task
                WHERE createdAt >= time::now() - 7d
                GROUP BY day
                ORDER BY day ASC
              ) AS taskActivity
            OMIT password
            FROM user
            ORDER BY
              createdAt DESC;
          RETURN $users;
        }
        `;
      };

      const referralCodeIndex = () => {
        return `DEFINE INDEX IF NOT EXISTS userReferralCodeIndex ON TABLE user COLUMNS referralCode UNIQUE;`;
      };

      const ownershipIndex = () => {
        return `
        DEFINE INDEX IF NOT EXISTS idx_owns_in
          ON TABLE owns
          FIELDS in;
        DEFINE INDEX IF NOT EXISTS idx_owns_out
          ON TABLE owns
          FIELDS out;
        `;
      };

      await db?.query(getUsersFunction());

      await db?.query(referralCodeIndex());
      await db?.query(ownershipIndex());

      // const kernel = getKernel();
      ensureAllUsersHaveNecessaryFields();
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

  static filterPublicFields(user: IUser | ISafeUser): IPublicUser;
  static filterPublicFields(user: (IUser | ISafeUser)[]): IPublicUser[];
  static filterPublicFields(
    user: (IUser | ISafeUser) | (IUser | ISafeUser)[],
  ): IPublicUser | IPublicUser[] {
    if (Array.isArray(user)) {
      return user.map((u) => this.filterPublicFields(u)) as IPublicUser[];
    }
    const { id, createdAt, updatedAt, firstName, lastName } = user;
    const publicUser: IPublicUser = {
      id,
      createdAt,
      updatedAt,
      firstName,
      lastName,
    };
    return publicUser as IPublicUser;
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
          referralCode: string;
        }
      >("user", {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        scratchpadContent: form.scratchpadContent,
        referralCode: Bun.randomUUIDv7(),
        acceptedPrivacyPolicyAt: new Date(),
        acceptedTermsOfServiceAt: new Date(),
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

  static async loadOnboarding(userId: string | RecordId) {
    try {
      const user = await User.get(userId);
      if (!user) {
        throw new Error("Couldn't get user onboarding");
      }
      const firstContent = firstIdea(user);
      const first = await Idea.create(
        {
          title: "Your First Idea",
          content: firstContent,
          embeddings: null,
          visibility: "private",
        },
        user.id.toString(),
        { omitEmbeddings: true, omitDerived: true },
      );
      if (!first) {
        throw new Error("Couldn't create first idea");
      }
      const secondContent = secondIdea(user);
      const second = await Idea.create(
        {
          title: "Your Second Idea",
          content: secondContent,
          embeddings: null,
          visibility: "private",
        },
        user.id.toString(),
        { omitEmbeddings: true, omitDerived: true },
      );
      if (!second) {
        throw new Error("Couldn't create second idea!");
      }
      await Idea.loadEmbeddings(first.id, true);
      await Idea.loadEmbeddings(second.id, true);
      const scratchpad = newScratchpad(user, first);
      const updated = await User.update(user.id, {
        scratchpadContent: scratchpad,
      });
      return updated;
    } catch (error) {
      console.error("Error loading user onboarding: ", error);
      return undefined;
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
      const deletedStuff = await this.deleteUserStuff(id);
      if (!deletedStuff) {
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

  static async deleteUserStuff(userId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database.");
      }
      const deletions = [
        `DELETE idea WHERE <-owns<-(user WHERE id = $userId)`,
        `DELETE task WHERE <-owns<-(user WHERE id = $userId)`,
        `DELETE source WHERE <-owns<-(user WHERE id = $userId)`,
        `DELETE excerpt WHERE <-owns<-(user WHERE id = $userId)`,
        `DELETE tag WHERE <-owns<-(user WHERE id = $userId)`,
        `DELETE rabbithole WHERE <-owns<-(user WHERE id = $userId)`,
        `DELETE spyglass WHERE <-searched<-(user WHERE id = $userId)`,
        `DELETE import WHERE <-initiated_import<-(user WHERE id = $userId)`,
      ];
      for (const d of deletions) {
        await db.query(d, {
          userId: new StringRecordId(userId),
        });
      }
      return true;
    } catch (error) {
      console.error("Error deleting user stuff: ", error);
      return undefined;
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
      console.error("Error finding user by email:", error);
      throw error;
    }
  }

  static async findByReferralCode(
    referralCode: string,
    unsafe?: true,
  ): Promise<IUser | undefined>;
  static async findByReferralCode(
    referralCode: string,
    unsafe?: false,
  ): Promise<ISafeUser | undefined>;
  static async findByReferralCode(
    referralCode: string,
    unsafe = false,
  ): Promise<IUser | ISafeUser | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        console.info("Cannot findByReferralCode: Database not available.");
        return undefined;
      }
      const result = await db.query<[IUser[] | undefined]>(
        "SELECT * FROM user WHERE referralCode = $rc",
        { rc: referralCode },
      );
      if (!result || !result[0] || result[0].length === 0) {
        console.info(`No user found with referral code: ${referralCode}`);
        return undefined;
      }
      const user = result[0][0];
      if (unsafe) {
        return user;
      }
      return this.filterSafeFields(user) as ISafeUser;
    } catch (error) {
      console.error(
        `Error finding user by referral code ${referralCode}:`,
        error,
      );
      throw error;
    }
  }

  static async sendInvitationEmail(
    to: { firstName: string; lastName: string; email: string },
    sender: ISafeUser,
  ) {
    try {
      const invitation = invitationTemplate(to, sender);
      const worked = await sendEmail(
        to.email,
        "Invitation to join Noeko",
        invitation,
        {
          from: "team",
        },
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

  static async checkOwns(
    userId: string | RecordId,
    thingId: string | RecordId,
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not available.");
      }
      const results = await db.query<[number]>(
        `count(SELECT VALUE id FROM owns WHERE in = $userId AND out = $thingId)`,
        {
          userId: new StringRecordId(userId),
          thingId: new StringRecordId(thingId),
        },
      );
      if (!results) {
        throw new Error("No results for ownership check");
      }
      const owns = results[0] > 0;
      return owns;
    } catch (error) {
      console.error("Error checking user owns: ", userId, thingId, error);
      return undefined;
    }
  }

  static async checkOwnsMany(
    userId: string | RecordId,
    thingIds: (string | RecordId)[],
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not available.");
      }
      for (const thing of thingIds) {
        const owns = await this.checkOwns(userId, thing);
        if (!owns) {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error("Error checking user owns: ", userId, thingIds, error);
      return undefined;
    }
  }

  static async generateAccessToken(user: ISafeUser | IPublicUser) {
    try {
      const token = generateToken<ISafeUser | IPublicUser>(user, {
        expiresIn: "1hr",
      });
      return token;
    } catch (error) {
      console.error("Error generating access token:", error);
      throw error;
    }
  }

  static async generateRefreshToken(user: ISafeUser | IPublicUser) {
    try {
      const token = generateToken<ISafeUser | IPublicUser>(user, {
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

  static async ensureReferralCodes(force = false): Promise<void> {
    try {
      const db = await getDatabase();
      if (!db) {
        console.info("Cannot run ensureReferralCodes due to lack of db.");
        return;
      }

      console.info("Getting all...");
      const users = await this.getAll(); // Fetches ISafeComputedUsers[]

      if (!users) {
        throw new Error("Couldn't get all users");
      }

      for (const user of users) {
        if (!user.referralCode || force) {
          const newReferralCode = Bun.randomUUIDv7();
          console.info(
            `User ${user.id} missing referral code. Assigning: ${newReferralCode}`,
          );
          await db.merge(user.id, {
            referralCode: newReferralCode,
            updatedAt: new Date(),
          });
        }
      }
      console.info(
        "Finished checking and assigning referral codes for all users.",
      );
    } catch (error) {
      console.error("Error in ensureReferralCodes:", error);
      return undefined;
    }
  }

  static async isReferralCodeValid(referralCode: string): Promise<boolean> {
    try {
      const db = await getDatabase();
      if (!db) {
        console.info(
          "Cannot check referral code validity: Database not available.",
        );
        return false;
      }

      // Find user by referral code
      const queryResult = await db.query<[IUser[]]>(
        "SELECT * FROM user WHERE referralCode = $rc",
        { rc: referralCode },
      );

      if (!queryResult || !queryResult[0] || queryResult[0].length === 0) {
        console.info(`Referral code ${referralCode} not found.`);
        return false;
      }
      const user = queryResult[0][0];

      // Check if user is disabled
      if (await User.isDisabled(user.id)) {
        console.info(
          `User ${user.id} (email: ${user.email}) associated with referral code ${referralCode} is disabled.`,
        );
        return false;
      }

      // Check SUPERUSER_INVITE_ONLY condition
      if (process.env.SUPERUSER_INVITE_ONLY === "true") {
        const isSuperuser = await User.checkUserHasRole(user.id, "superuser");
        if (!isSuperuser) {
          console.info(
            `SUPERUSER_INVITE_ONLY is active. User ${user.id} (email: ${user.email}, referral: ${referralCode}) is not a superuser. Code invalid.`,
          );
          return false;
        }
        console.info(
          `SUPERUSER_INVITE_ONLY is active. User ${user.id} (email: ${user.email}, referral: ${referralCode}) is a superuser. Code valid so far.`,
        );
      } else {
        console.info(
          `SUPERUSER_INVITE_ONLY is not active or not 'true'. Skipping superuser check for ${user.id} (referral: ${referralCode}). Code valid so far.`,
        );
      }

      // All checks passed
      console.info(
        `Referral code ${referralCode} is valid for user ${user.id} (email: ${user.email}).`,
      );
      return true;
    } catch (error) {
      console.error(
        `Error in isReferralCodeValid for code ${referralCode}:`,
        error,
      );
      return false; // On any error, treat the code as invalid
    }
  }

  static async addReferralRelationship(
    referrerUserId: string,
    referredUserId: string,
  ): Promise<void> {
    try {
      const db = await getDatabase();
      if (!db) {
        console.info(
          "Cannot add referral relationship: Database not available.",
        );
        return;
      }

      const referrerId = new StringRecordId(referrerUserId);
      const referredId = new StringRecordId(referredUserId);

      const query = `RELATE $referrerId->referred->$referredId CONTENT { createdAt: time::now() };`;
      await db.query(query, {
        referredId,
        referrerId,
      });

      console.info(
        `Successfully created REFERRED relationship: ${referrerId} -> ${referredId}`,
      );
    } catch (error) {
      console.error(
        `Error creating REFERRED relationship between ${referrerUserId} and ${referredUserId}:`,
        error,
      );
      return undefined;
    }
  }

  static async refreshAllUserReferralCodes(): Promise<void> {
    try {
      // User.getAll() returns Promise<IComputedUser[]>
      // IComputedUser is compatible with IUser, which User.ensureReferralCodes expects.
      await User.ensureReferralCodes(false);
      console.info(`[User] Completed referral code refresh for all users.`);
    } catch (error) {
      console.error("[User] Error refreshing all user referral codes:", error);
      // Re-throw the error so the job runner can pick it up
      throw error;
    }
  }

  static async generatePasswordResetToken(
    user: ISafeUser,
  ): Promise<string | null> {
    try {
      const resetToken = generateToken<{ userId: string; type: string }>(
        { userId: user.id, type: "password_reset" },
        { expiresIn: "1h" },
      );

      // Store the token in the database with 1 hour expiration
      await Token.create(
        user.id,
        resetToken,
        "password_reset",
        new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      );

      return resetToken;
    } catch (error) {
      console.error("Error generating password reset token:", error);
      return null;
    }
  }

  static async sendPasswordResetEmail(
    user: ISafeUser,
    resetToken: string,
  ): Promise<boolean> {
    try {
      const emailContent = passwordResetTemplate(user, resetToken);
      const success = await sendEmail(
        user.email,
        "Reset Your Noeko Password",
        emailContent,
      );
      return success;
    } catch (error) {
      console.error("Error sending password reset email:", error);
      return false;
    }
  }

  static async resetPasswordWithToken(
    token: string,
    newPassword: string,
  ): Promise<boolean> {
    try {
      // Find the token in the database
      const tokenRecord = await Token.findByToken(token);
      if (!tokenRecord) {
        console.error("Password reset token not found");
        return false;
      }

      // Check if token is expired
      if (new Date() > tokenRecord.expiresAt) {
        console.error("Password reset token has expired");
        await Token.delete(tokenRecord.id);
        return false;
      }

      // Verify the token type
      if (tokenRecord.type !== "password_reset") {
        console.error("Invalid token type for password reset");
        return false;
      }

      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);

      // Update the user's password
      await User.update(tokenRecord.user.id, { password: hashedPassword });

      // Delete the used token
      await Token.delete(tokenRecord.id);

      return true;
    } catch (error) {
      console.error("Error resetting password with token:", error);
      return false;
    }
  }

  static async logout(refreshToken: string): Promise<boolean> {
    try {
      // Find the refresh token in the database
      const tokenRecord = await Token.findByToken(refreshToken);
      if (!tokenRecord) {
        console.warn("Refresh token not found for logout");
        return false;
      }

      // Delete the refresh token from the database
      await Token.delete(tokenRecord.id);
      return true;
    } catch (error) {
      console.error("Error during logout:", error);
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
