import { verifyAccessToken } from "../utils/jwt.js";
/*
 * Authentication middleware.
 *
 * Expected header:
 *
 * Authorization: Bearer <access-token>
 *
 * The middleware:
 *
 * 1. Checks that the Authorization header exists.
 * 2. Checks that it uses the Bearer format.
 * 3. Extracts the JWT.
 * 4. Verifies the JWT.
 * 5. Stores the authenticated user in req.user.
 * 6. Allows the request to continue.
 */
export function authenticate(req, res, next) {
    try {
        /*
         * Read Authorization header.
         */
        const authorization = req.headers.authorization;
        /*
         * No Authorization header.
         */
        if (!authorization) {
            res.status(401).json({
                success: false,
                message: "Authorization header is required",
            });
            return;
        }
        /*
         * Expected format:
         *
         * Bearer eyJhbGciOi...
         */
        const [scheme, token] = authorization.split(" ");
        /*
         * Check Bearer format.
         */
        if (scheme?.toLowerCase() !== "bearer" ||
            !token) {
            res.status(401).json({
                success: false,
                message: "Invalid authorization format. Use Bearer <token>",
            });
            return;
        }
        /*
         * Verify the access token.
         *
         * verifyAccessToken() already uses:
         *
         * JWT_ACCESS_SECRET
         *
         * from the environment configuration.
         */
        const payload = verifyAccessToken(token);
        /*
         * Make sure the token contains the information
         * required by our application.
         */
        if (!payload.userId ||
            !payload.role) {
            res.status(401).json({
                success: false,
                message: "Invalid access token payload",
            });
            return;
        }
        /*
         * Store authenticated user information
         * on the Express request.
         */
        req.user = {
            userId: payload.userId,
            role: payload.role,
        };
        /*
         * Authentication successful.
         *
         * Continue to the controller.
         */
        next();
    }
    catch (error) {
        console.error("Authentication middleware error:", error);
        /*
         * JWT verification errors normally end up here:
         *
         * - expired token
         * - invalid token
         * - malformed token
         * - wrong secret
         */
        res.status(401).json({
            success: false,
            message: "Invalid or expired access token",
        });
    }
}
//# sourceMappingURL=auth.middleware.js.map