import "dotenv/config";
import { z } from "zod";
const envSchema = z.object({
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
    PORT: z.coerce.number().default(5000),
    DATABASE_URL: z.string().min(1),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
    REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
    OTP_EXPIRES_IN_MINUTES: z.coerce.number().default(10),
    OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
    EMAIL_FROM: z.string().email(),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_USER: z.string().min(1),
    SMTP_PASSWORD: z.string().min(1),
    SMS_PROVIDER: z.string().default("console"),
});
const result = envSchema.safeParse(process.env);
if (!result.success) {
    console.error("Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
}
export const env = result.data;
//# sourceMappingURL=env.js.map