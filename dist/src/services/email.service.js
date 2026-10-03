import nodemailer from "nodemailer";
import { env } from "../config/env.js";
/*
 * ============================================================
 * EMAIL TRANSPORTER
 * ============================================================
 */
const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
    },
});
/*
 * ============================================================
 * VERIFY EMAIL CONNECTION
 * ============================================================
 */
export async function verifyEmailConnection() {
    await transporter.verify();
    console.log("✅ Gmail SMTP connection successful");
}
/*
 * ============================================================
 * SEND ACCOUNT VERIFICATION EMAIL
 * ============================================================
 *
 * Used during registration.
 */
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
/*
 * ============================================================
 * SEND GENERAL EMAIL
 * ============================================================
 *
 * This is used by the notification system for:
 *
 * - Loan approved
 * - Loan rejected
 * - Loan disbursed
 * - Repayment reminder
 * - Overdue notification
 * - Payment received
 * - Other system notifications
 */
export async function sendEmail(email, subject, message) {
    await transporter.sendMail({
        from: env.EMAIL_FROM,
        to: email,
        subject,
        text: message,
        html: `
      <!DOCTYPE html>

      <html>
        <body>

          <h2>
            ${subject}
          </h2>

          <p>
            ${message}
          </p>

          <p>
            Regards,<br />
            Loan Platform
          </p>

        </body>
      </html>
    `,
    });
}
/*
 * Send a general application notification email.
 *
 * Used for:
 *
 * - Loan repayment reminders
 * - Overdue loan notifications
 * - Loan approval
 * - Loan rejection
 * - Loan disbursement
 * - Payment confirmation
 */
export async function sendLoanNotificationEmail(email, title, message) {
    await transporter.sendMail({
        from: env.EMAIL_FROM,
        to: email,
        subject: title,
        /*
         * Plain-text version.
         */
        text: message,
        /*
         * HTML version.
         */
        html: `
      <!DOCTYPE html>
      <html>
        <body>
          <h2>${title}</h2>

          <p>
            ${message}
          </p>

          <p>
            Loan Platform
          </p>
        </body>
      </html>
    `,
    });
}
//# sourceMappingURL=email.service.js.map