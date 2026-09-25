import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { env } from "../config/env.js";
export function generateAccessToken(payload) {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
        expiresIn: env.ACCESS_TOKEN_EXPIRES_IN,
    });
}
export function generateRefreshToken() {
    return crypto
        .randomBytes(64)
        .toString("hex");
}
export function hashRefreshToken(token) {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}
export function verifyAccessToken(token) {
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
}
//# sourceMappingURL=jwt.js.map