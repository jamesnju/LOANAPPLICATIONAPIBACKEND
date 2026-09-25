import { env } from "../config/env.js";
export async function sendVerificationSms(phone, otp) {
    if (env.SMS_PROVIDER === "console") {
        console.log("");
        console.log("====================================");
        console.log("          DEVELOPMENT SMS");
        console.log("====================================");
        console.log(`To: ${phone}`);
        console.log(`Your verification code is: ${otp}`);
        console.log(`Expires in: ${env.OTP_EXPIRES_IN_MINUTES} minutes`);
        console.log("====================================");
        console.log("");
        return;
    }
    /*
     * Real SMS provider will be implemented here.
     */
}
//# sourceMappingURL=sms.service.js.map