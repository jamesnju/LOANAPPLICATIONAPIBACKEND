import rateLimit from "express-rate-limit";
/*
 * General API rate limiter.
 *
 * 100 requests per 15 minutes
 * per IP address.
 */
export const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests. Please try again later.",
    },
});
/*
 * Strict authentication rate limiter.
 *
 * Useful for:
 *
 * - Login
 * - OTP
 * - Password reset
 */
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many authentication attempts. Please try again later.",
    },
});
//# sourceMappingURL=rateLimit.middleware.js.map