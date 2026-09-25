import crypto from "node:crypto";
import bcrypt from "bcrypt";

export function generateOtp(): string {
  return crypto
    .randomInt(100000, 1000000)
    .toString();
}

export async function hashOtp(
  code: string
): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function verifyOtp(
  code: string,
  codeHash: string
): Promise<boolean> {
  return bcrypt.compare(
    code,
    codeHash
  );
}