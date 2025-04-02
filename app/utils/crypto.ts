import { JwtPayload, sign, SignOptions, verify } from "jsonwebtoken";

const { TOKEN_SECRET } = process.env;

if (!TOKEN_SECRET) {
  throw new Error("TOKEN_SECRET environment variable is not set");
}

export const hashPassword = async (password: string): Promise<string> => {
  const hashed = await Bun.password.hash(password);
  return hashed;
};

export const verifyPassword = async (
  password: string,
  hashedPassword: string,
): Promise<boolean> => {
  console.log("Password and hashedPassword:", password, hashedPassword);
  const verified = await Bun.password.verify(password, hashedPassword);
  console.log("Verified: ", verified);
  return verified;
};

export function generateToken<T extends object | string>(
  payload: T,
  options?: SignOptions,
): string {
  if (!TOKEN_SECRET) {
    throw new Error("TOKEN_SECRET environment variable is not set");
  }
  const token = sign(payload, TOKEN_SECRET, options);
  return token;
}

export async function verifyToken<T extends object | string>(
  token: string,
): Promise<T | undefined> {
  if (!TOKEN_SECRET) {
    throw new Error("TOKEN_SECRET environment variable is not set");
  }
  try {
    const decoded = verify(token, TOKEN_SECRET);
    return decoded as T;
  } catch (error) {
    return undefined;
  }
}
