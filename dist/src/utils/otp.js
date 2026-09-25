import crypto from "node:crypto";
import bcrypt from "bcrypt";
export function generateOtp() {
    return crypto
        .randomInt(100000, 1000000)
        .toString();
}
export async function hashOtp(code) {
    return bcrypt.hash(code, 10);
}
export async function verifyOtp(code, codeHash) {
    return bcrypt.compare(code, codeHash);
}
//# sourceMappingURL=otp.js.map