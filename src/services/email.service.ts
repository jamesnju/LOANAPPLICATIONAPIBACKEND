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

export async function verifyEmailConnection(): Promise<void> {
  await transporter.verify();

  console.log(
    "✅ Gmail SMTP connection successful"
  );
}


/*
 * ============================================================
 * SEND ACCOUNT VERIFICATION EMAIL
 * ============================================================
 *
 * Used during registration.
 */

export async function sendVerificationEmail(
  email: string,
  otp: string
): Promise<void> {

  await transporter.sendMail({
    from: env.EMAIL_FROM,

    to: email,

    subject:
      "Verify your Loan Platform account",

    text:
      `Your verification code is ${otp}. ` +
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

export async function sendEmail(
  email: string,
  subject: string,
  message: string,
): Promise<void> {

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
export async function sendLoanNotificationEmail(
  email: string,
  title: string,
  message: string,
): Promise<void> {
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
/* ============================================================
 * ACCOUNT LOCKED
 * ============================================================ */
export async function sendAccountLockedEmail(
  email: string,
  firstName: string,
  lockedUntil: Date,
): Promise<void> {
  const untilStr = lockedUntil.toUTCString();

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: email,
    subject: "Your account has been locked",
    text:
      `Hi ${firstName},\n\n` +
      `Your account has been temporarily locked after 4 failed login attempts.\n` +
      `It will automatically unlock at ${untilStr}.\n\n` +
      `If this wasn't you, please contact support immediately.`,
    html: `
      <!DOCTYPE html>
      <html>
        <body>
          <h2>Account locked</h2>
          <p>Hi ${firstName},</p>
          <p>
            Your account has been temporarily locked after
            <strong>4 failed login attempts</strong>.
          </p>
          <p>
            It will automatically unlock at
            <strong>${untilStr}</strong>.
          </p>
          <p>
            If this wasn't you, please contact support immediately.
          </p>
          <p>— Loan Platform</p>
        </body>
      </html>
    `,
  });
}

/* ============================================================
 * ACCOUNT UNLOCKED (by admin)
 * ============================================================ */
export async function sendAccountUnlockedEmail(
  email: string,
  firstName: string,
): Promise<void> {
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: email,
    subject: "Your account has been unlocked",
    text:
      `Hi ${firstName},\n\n` +
      `An administrator has unlocked your account. You can now log in again.`,
    html: `
      <!DOCTYPE html>
      <html>
        <body>
          <h2>Account unlocked</h2>
          <p>Hi ${firstName},</p>
          <p>
            An administrator has unlocked your account.
            You can now log in again.
          </p>
          <p>— Loan Platform</p>
        </body>
      </html>
    `,
  });
}
/* ============================================================
 * PASSWORD RESET EMAIL
 * ============================================================ */
export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  code: string,
  ttlMinutes: number,
): Promise<void> {
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: email,
    subject: "Reset your Loan Platform password",
    text:
      `Hi ${firstName},\n\n` +
      `Your password reset code is: ${code}\n\n` +
      `This code expires in ${ttlMinutes} minutes.\n\n` +
      `If you didn't request this, please ignore this email — your password ` +
      `will not change.`,
    html: `
      <!DOCTYPE html>
      <html>
        <body>
          <h2>Reset your password</h2>
          <p>Hi ${firstName},</p>
          <p>Your password reset code is:</p>
          <h1 style="letter-spacing:4px;font-family:monospace;">${code}</h1>
          <p>This code expires in <strong>${ttlMinutes} minutes</strong>.</p>
          <p>
            If you didn't request this, please ignore this email —
            your password will not change.
          </p>
          <p>— Loan Platform</p>
        </body>
      </html>
    `,
  });
}