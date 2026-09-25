import nodemailer from "nodemailer";
import { env } from "../config/env.js";
const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
    },
});
export async function verifyEmailConnection() {
    await transporter.verify();
    console.log("✅ Gmail SMTP connection successful");
}
export async function sendVerificationEmail(email, otp) {
    await transporter.sendMail({
        from: env.EMAIL_FROM,
        to: email,
        subject: "Verify your Loan Platform account",
        text: `Your verification code is ${otp}. ` +
            `This code expires in ` +
            `${env.OTP_EXPIRES_IN_MINUTES} minutes.`,
        html: `
      <!DOCTYPE html>

      <html>
        <body>

          <h2>
            Verify your Loan Platform account
          </h2>

          <p>
            Your verification code is:
          </p>

          <h1>
            ${otp}
          </h1>

          <p>
            This code expires in
            ${env.OTP_EXPIRES_IN_MINUTES}
            minutes.
          </p>

          <p>
            If you did not create this
            account, please ignore this email.
          </p>

        </body>
      </html>
    `,
    });
}
//# sourceMappingURL=email.service.js.map