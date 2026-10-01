import {
  randomBytes,
  createHash,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { config } from "./config.js";
const SCRYPT_COST = 131072;
const LEGACY_SCRYPT_COST = 16384;
function deriveKey(
  password: string,
  salt: string,
  cost: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCallback(
      password,
      salt,
      64,
      { N: cost, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      },
    ),
  );
}
export function needsPasswordRehash(encoded: string): boolean {
  return !encoded.startsWith(`scrypt:${SCRYPT_COST}:8:1:`);
}
const secret = new TextEncoder().encode(config.JWT_SECRET);
export const opaqueToken = () => randomBytes(32).toString("base64url");
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const result = await deriveKey(password, salt, SCRYPT_COST);
  return `scrypt:${SCRYPT_COST}:8:1:${salt}:${result.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const parts = encoded.split(":");
  if (parts.length !== 6) return false;
  const [algorithm, n, r, p, salt, hash] = parts;
  if (
    algorithm !== "scrypt" ||
    ![String(SCRYPT_COST), String(LEGACY_SCRYPT_COST)].includes(n!) ||
    r !== "8" ||
    p !== "1" ||
    !salt ||
    !hash ||
    !/^[a-f0-9]{32}$/.test(salt) ||
    !/^[a-f0-9]{128}$/.test(hash)
  )
    return false;
  const result = await deriveKey(password, salt, Number(n));
  const expected = Buffer.from(hash, "hex");
  return expected.length === result.length && timingSafeEqual(expected, result);
}
export async function signAccess(userId: string, sessionId: string) {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer("orbit-api")
    .setAudience("orbit-web")
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}
export async function verifyAccess(token: string) {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
    issuer: "orbit-api",
    audience: "orbit-web",
  });
  if (typeof payload.sub !== "string" || typeof payload.sid !== "string")
    throw new Error("Token inválido");
  return { userId: payload.sub, sessionId: payload.sid };
}
