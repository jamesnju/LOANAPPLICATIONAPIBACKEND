import { env } from "../config/env.js";
export async function sendVerificationSms(phone, otp) {
    if (env.SMS_PROVIDER === "console") {
        console.log("=================================");
        console.log(`📱 SMS OTP for ${phone}`);
        console.log(`OTP: ${otp}`);
        console.log(`Expires in ${env.OTP_EXPIRES_IN_MINUTES} minutes`);
        console.log("=================================");
        return;
    }
    throw new Error("SMS provider is not configured");
}
//# sourceMappingURL=sms.service.js.map