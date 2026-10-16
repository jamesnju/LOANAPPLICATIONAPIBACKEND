import nodemailer from "nodemailer";
import { env } from "../config/env.js";

/* ============================================================
 * THEME
 * ============================================================
 * Colors pulled from the PesaMaishaCapital logo.
 * ============================================================ */
const BRAND = {
  teal: "#0d9488",
  navy: "#0f1e2e",
  gold: "#d4a017",
  text: "#0f1e2e",
  muted: "#64748b",
  border: "#e2e8f0",
  surface: "#f7f9fb",
  pageBg: "#f7f9fb",
  cardBg: "#ffffff",
};

/* ============================================================
 * TRANSPORTER
 * ============================================================ */
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
});

/* ============================================================
 * LAYOUT HELPERS
 * ============================================================
 * All emails share the same skeleton:
 *   - Header: logo + company name
 *   - Body: title + message content
 *   - Footer: support contact + copyright
 * ============================================================ */

/**
 * Renders a full HTML email with the brand header, body, and
 * footer. Every email in the app goes through this function so
 * the look is consistent.
 *
 * Uses table-based layout because most email clients (Outlook,
 * Gmail web, iOS Mail) handle tables far more reliably than
 * flexbox or CSS grid.
 */
function renderEmail(opts: {
  title: string;
  contentHtml: string;
  contentText: string;
  cta?: { label: string; url: string };
  notice?: string;
}): { html: string; text: string } {
  const logoUrl = env.LOGO_URL;
  const supportEmail = env.SUPPORT_EMAIL;
  const supportPhone = env.SUPPORT_PHONE;
  const companyName = env.COMPANY_NAME;
  const frontendUrl = env.PUBLIC_FRONTEND_URL;
  const frontendDisplay = frontendUrl.replace(/^https?:\/\//, "");
  const year = new Date().getFullYear();

  /* Version query param — busts email-client caches when the logo
   * is updated. Bump this string when you replace the file. */
  const logoCacheBust = "v1";
  const cacheBustedLogoUrl = `${logoUrl}${logoUrl.includes("?") ? "&" : "?"}v=${logoCacheBust}`;
const cacheBustedFooterLogoUrl = `${logoUrl}${logoUrl.includes("?") ? "&" : "?"}v=${logoCacheBust}-footer`;
  const ctaBlock = opts.cta
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
        <tr>
          <td align="center" style="border-radius: 8px; background-color: ${BRAND.teal};">
            <a href="${opts.cta.url}"
               target="_blank"
               style="display: inline-block; padding: 14px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
              ${opts.cta.label}
            </a>
          </td>
        </tr>
      </table>
    `
    : "";

  const noticeBlock = opts.notice
    ? `
      <p style="margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: ${BRAND.muted}; line-height: 1.5;">
        ${opts.notice}
      </p>
    `
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light" />
  <title>${opts.title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.pageBg}; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.pageBg};">
    <tr>
      <td align="center" style="padding: 32px 16px;">

        <!-- ══════════════ CARD ══════════════ -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: ${BRAND.cardBg}; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">

          <!-- ─── Header band ─── -->
          <tr>
            <td style="background-color: ${BRAND.teal}; padding: 28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" width="56">
                    <img src="${cacheBustedLogoUrl}"
                         alt="${companyName}"
                         width="48"
                         height="48"
                         style="display: block; width: 48px; height: 48px; border-radius: 8px; background-color: #ffffff; object-fit: contain;" />
                  </td>
                  <td valign="middle" style="padding-left: 16px;">
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.01em;">
                      ${companyName}
                    </p>
                    <p style="margin: 2px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.85); letter-spacing: 0.05em; text-transform: uppercase;">
                      Grow Today. Secure Tomorrow.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ─── Body ─── -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h1 style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 700; color: ${BRAND.text}; line-height: 1.3;">
                ${opts.title}
              </h1>

              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: ${BRAND.text};">
                ${opts.contentHtml}
              </div>

              ${ctaBlock}
              ${noticeBlock}
            </td>
          </tr>

          <!-- ─── Sign-off ─── -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <p style="margin: 24px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: ${BRAND.text}; line-height: 1.6;">
                Kind regards,
              </p>
              <p style="margin: 4px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 700; color: ${BRAND.teal}; line-height: 1.6;">
                The ${companyName} Team
              </p>
            </td>
          </tr>

          <!-- ══════════════ FOOTER BAND ══════════════ -->
         <!-- ══════════════ FOOTER BAND ══════════════ -->
<tr>
  <td style="background-color: ${BRAND.surface}; border-top: 1px solid ${BRAND.border}; padding: 0;">

    <!-- ── Large centered logo ── -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding: 40px 32px 28px 32px;">
          <img src="${cacheBustedFooterLogoUrl}"
               alt="${companyName}"
               width="140"
               height="140"
               style="display: block; width: 140px; height: 140px; margin: 0 auto; object-fit: contain;" />
        </td>
      </tr>
    </table>

    <!-- ── Divider ── -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding: 0 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="border-top: 1px solid ${BRAND.border};"></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- ── Contact ── -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding: 24px 32px;">
          <p style="margin: 0 0 14px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 700; color: ${BRAND.navy}; letter-spacing: 0.06em; text-transform: uppercase;">
            Need help?
          </p>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
            <tr>
              <td style="padding: 5px 12px 5px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${BRAND.muted}; text-align: right; white-space: nowrap;">
                Email
              </td>
              <td style="padding: 5px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; text-align: left; white-space: nowrap;">
                <a href="mailto:${supportEmail}" style="color: ${BRAND.teal}; text-decoration: none; font-weight: 600;">
                  ${supportEmail}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding: 5px 12px 5px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${BRAND.muted}; text-align: right; white-space: nowrap;">
                Call or WhatsApp
              </td>
              <td style="padding: 5px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; text-align: left; white-space: nowrap;">
                <a href="tel:${supportPhone.replace(/\s/g, "")}" style="color: ${BRAND.teal}; text-decoration: none; font-weight: 600;">
                  ${supportPhone}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding: 5px 12px 5px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${BRAND.muted}; text-align: right; white-space: nowrap;">
                Visit
              </td>
              <td style="padding: 5px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; text-align: left; white-space: nowrap;">
                <a href="${frontendUrl}" style="color: ${BRAND.teal}; text-decoration: none; font-weight: 600;">
                  ${frontendDisplay}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- ── Divider ── -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding: 0 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="border-top: 1px solid ${BRAND.border};"></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- ── Legal ── -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding: 20px 32px 28px 32px;">
          <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: ${BRAND.muted}; line-height: 1.6;">
            © ${year} ${companyName}. All rights reserved.
          </p>
          <p style="margin: 8px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; color: ${BRAND.muted}; line-height: 1.6;">
            This is an automated message. Please do not reply directly to this email.
          </p>
        </td>
      </tr>
    </table>

  </td>
</tr>
<!-- ══════════════ /FOOTER BAND ══════════════ -->
          <!-- ══════════════ /FOOTER BAND ══════════════ -->

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${opts.title}

${opts.contentText}

${opts.cta ? `\n${opts.cta.label}: ${opts.cta.url}\n` : ""}
${opts.notice ? `\n${opts.notice}\n` : ""}

Kind regards,
The ${companyName} Team

--
Need help?
Email: ${supportEmail}
Call or WhatsApp: ${supportPhone}
Visit: ${frontendDisplay}

© ${year} ${companyName}. All rights reserved.
This is an automated message. Please do not reply directly to this email.`;

  return { html, text };
}

/* ============================================================
 * SMALL COMPONENT HELPERS
 * ============================================================ */

/** Renders a highlighted number/code block (used for OTPs). */
function renderCodeBlock(code: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
      <tr>
        <td align="center" style="background-color: ${BRAND.surface}; border: 1px solid ${BRAND.border}; border-radius: 10px; padding: 18px 32px;">
          <p style="margin: 0; font-family: 'SF Mono', Menlo, Monaco, Consolas, monospace; font-size: 30px; font-weight: 700; letter-spacing: 0.35em; color: ${BRAND.navy};">
            ${code}
          </p>
        </td>
      </tr>
    </table>
  `;
}

/** Renders a stacked list of label/value rows as a bordered table. */
function renderDetailsTable(rows: [string, string][]): string {
  const html = rows
    .map(
      ([label, value], i) => `
      <tr>
        <td style="padding: 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${BRAND.muted}; width: 40%; ${i > 0 ? `border-top: 1px solid ${BRAND.border};` : ""}">
          ${label}
        </td>
        <td style="padding: 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${BRAND.text}; font-weight: 600; text-align: right; ${i > 0 ? `border-top: 1px solid ${BRAND.border};` : ""}">
          ${value}
        </td>
      </tr>
    `,
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0; border: 1px solid ${BRAND.border}; border-radius: 10px; padding: 4px 16px;">
      ${html}
    </table>
  `;
}

/** Renders a soft-styled banner (used for warnings and confirmations). */
function renderBanner(opts: {
  tone: "info" | "success" | "warning" | "danger";
  title: string;
  body: string;
}): string {
  const palette = {
    info: { bg: "#eff6ff", border: "#bfdbfe", accent: "#1d4ed8" },
    success: { bg: "#f0fdf4", border: "#bbf7d0", accent: "#15803d" },
    warning: { bg: "#fffbeb", border: "#fde68a", accent: "#b45309" },
    danger: { bg: "#fef2f2", border: "#fecaca", accent: "#b91c1c" },
  }[opts.tone];

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
      <tr>
        <td style="background-color: ${palette.bg}; border: 1px solid ${palette.border}; border-radius: 10px; padding: 16px;">
          <p style="margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 700; color: ${palette.accent};">
            ${opts.title}
          </p>
          <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${BRAND.text}; line-height: 1.5;">
            ${opts.body}
          </p>
        </td>
      </tr>
    </table>
  `;
}

/* ============================================================
 * VERIFY EMAIL CONNECTION
 * ============================================================ */
export async function verifyEmailConnection(): Promise<void> {
  await transporter.verify();
  console.log("✅ Gmail SMTP connection successful");
}

/* ============================================================
 * 1. VERIFICATION EMAIL
 * ============================================================ */
export async function sendVerificationEmail(
  email: string,
  otp: string,
): Promise<void> {
  const { html, text } = renderEmail({
    title: "Verify your account",
    contentHtml: `
      <p style="margin: 0 0 12px 0;">Welcome to ${env.COMPANY_NAME}!</p>
      <p style="margin: 0;">Enter the code below to verify your email address and activate your account.</p>
      ${renderCodeBlock(otp)}
      <p style="margin: 0; color: ${BRAND.muted}; font-size: 13px;">
        This code expires in <strong>${env.OTP_EXPIRES_IN_MINUTES} minutes</strong>. If you did not create this account, you can safely ignore this email.
      </p>
    `,
    contentText: `Welcome to ${env.COMPANY_NAME}!

Your verification code is: ${otp}

This code expires in ${env.OTP_EXPIRES_IN_MINUTES} minutes. If you did not create this account, you can safely ignore this email.`,
  });

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: email,
    subject: `Verify your ${env.COMPANY_NAME} account`,
    text,
    html,
  });
}

/* ============================================================
 * 2. PASSWORD RESET EMAIL
 * ============================================================ */
export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  code: string,
  ttlMinutes: number,
): Promise<void> {
  const { html, text } = renderEmail({
    title: "Reset your password",
    contentHtml: `
      <p style="margin: 0 0 12px 0;">Hi ${firstName},</p>
      <p style="margin: 0;">We received a request to reset your password. Enter the code below to choose a new password.</p>
      ${renderCodeBlock(code)}
      <p style="margin: 0; color: ${BRAND.muted}; font-size: 13px;">
        This code expires in <strong>${ttlMinutes} minutes</strong>. If you didn't request a password reset, you can safely ignore this email — your password will not change.
      </p>
    `,
    contentText: `Hi ${firstName},

We received a request to reset your password.

Your password reset code is: ${code}

This code expires in ${ttlMinutes} minutes. If you didn't request a reset, you can safely ignore this email.`,
  });

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: email,
    subject: `Reset your ${env.COMPANY_NAME} password`,
    text,
    html,
  });
}

/* ============================================================
 * 3. ACCOUNT LOCKED
 * ============================================================ */
export async function sendAccountLockedEmail(
  email: string,
  firstName: string,
  lockedUntil: Date,
): Promise<void> {
  const untilStr = lockedUntil.toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const { html, text } = renderEmail({
    title: "Your account has been locked",
    contentHtml: `
      <p style="margin: 0 0 12px 0;">Hi ${firstName},</p>
      <p style="margin: 0;">For your security, we've temporarily locked your account after <strong>4 failed login attempts</strong>.</p>
      ${renderBanner({
      tone: "warning",
      title: "Unlocks automatically",
      body: `Your account will unlock at <strong>${untilStr}</strong>.`,
    })}
      <p style="margin: 0;">If this wasn't you, please contact our support team immediately — someone may be trying to access your account.</p>
    `,
    contentText: `Hi ${firstName},

For your security, we've temporarily locked your account after 4 failed login attempts.

Your account will unlock at: ${untilStr}

If this wasn't you, please contact support immediately.`,
  });

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: email,
    subject: "Your account has been locked",
    text,
    html,
  });
}

/* ============================================================
 * 4. ACCOUNT UNLOCKED
 * ============================================================ */
export async function sendAccountUnlockedEmail(
  email: string,
  firstName: string,
): Promise<void> {
  const { html, text } = renderEmail({
    title: "Your account has been unlocked",
    contentHtml: `
      <p style="margin: 0 0 12px 0;">Hi ${firstName},</p>
      <p style="margin: 0;">Good news — an administrator has unlocked your account. You can now sign in and continue using ${env.COMPANY_NAME}.</p>
      ${renderBanner({
      tone: "success",
      title: "Ready to sign in",
      body: "Use your registered email address and password to log in.",
    })}
    `,
    contentText: `Hi ${firstName},

An administrator has unlocked your account. You can now sign in and continue using ${env.COMPANY_NAME}.`,
    cta: {
      label: "Sign in to your account",
      url: `${env.PUBLIC_FRONTEND_URL}/login`,
    },
  });

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: email,
    subject: "Your account has been unlocked",
    text,
    html,
  });
}

/* ============================================================
 * 5. GENERAL LOAN NOTIFICATION EMAIL
 * ============================================================
 * Used by the notification service for application approvals,
 * rejections, repayments, disbursements, and reminders.
 */
export async function sendLoanNotificationEmail(
  email: string,
  title: string,
  message: string,
): Promise<void> {
  /* Convert line breaks in the message into paragraphs. */
  const htmlBody = message
    .split("\n\n")
    .map((p) => `<p style="margin: 0 0 12px 0;">${p.replace(/\n/g, "<br />")}</p>`)
    .join("");

  const { html, text } = renderEmail({
    title,
    contentHtml: htmlBody,
    contentText: message,
    cta: {
      label: "Open your dashboard",
      url: `${env.PUBLIC_FRONTEND_URL}/dashboard`,
    },
  });

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: email,
    subject: title,
    text,
    html,
  });
}

/* ============================================================
 * 6. GENERIC EMAIL
 * ============================================================
 * Simple one-off email. Kept for compatibility with existing
 * callers that pass a subject and message directly.
 */
export async function sendEmail(
  email: string,
  subject: string,
  message: string,
): Promise<void> {
  const { html, text } = renderEmail({
    title: subject,
    contentHtml: `<p style="margin: 0; white-space: pre-line;">${message}</p>`,
    contentText: message,
  });

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: email,
    subject,
    text,
    html,
  });
}

/* ============================================================
 * 7. SIGNED APPLICATION EMAIL (with PDF)
 * ============================================================ */
export async function sendSignedApplicationEmail(opts: {
  to: string;
  firstName: string;
  applicationNumber: string;
  pdf: Buffer;
}): Promise<void> {
  const { html, text } = renderEmail({
    title: "Your signed loan application",
    contentHtml: `
      <p style="margin: 0 0 12px 0;">Hi ${opts.firstName},</p>
      <p style="margin: 0 0 12px 0;">Your loan application <strong>${opts.applicationNumber}</strong> has been signed and submitted successfully.</p>
      <p style="margin: 0;">The signed agreement is attached to this email. Please keep it safe — it is your legal record of the terms you agreed to.</p>
      ${renderBanner({
      tone: "info",
      title: "What happens next",
      body: "Our team will review your application and notify you once a decision is made.",
    })}
    `,
    contentText: `Hi ${opts.firstName},

Your loan application ${opts.applicationNumber} has been signed and submitted successfully.

The signed agreement is attached to this email. Please keep it safe — it is your legal record of the terms you agreed to.

Our team will review your application and notify you once a decision is made.`,
  });

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: opts.to,
    subject: `Your signed loan application — ${opts.applicationNumber}`,
    text,
    html,
    attachments: [
      {
        filename: `Application-${opts.applicationNumber}.pdf`,
        content: opts.pdf,
        contentType: "application/pdf",
      },
    ],
  });
}

/* ============================================================
 * 8. DISBURSEMENT RECEIPT EMAIL
 * ============================================================ */
export async function sendDisbursementReceiptEmail(opts: {
  to: string;
  firstName: string;
  loanNumber: string;
  totalAmount: number;
  pdf: Buffer;
}): Promise<void> {
  const amount = `KES ${opts.totalAmount.toLocaleString("en-KE")}`;

  const { html, text } = renderEmail({
    title: "Your loan has been disbursed",
    contentHtml: `
      <p style="margin: 0 0 12px 0;">Hi ${opts.firstName},</p>
      <p style="margin: 0;">Your loan <strong>${opts.loanNumber}</strong> has been disbursed. The funds are on their way to your M-Pesa.</p>
      ${renderDetailsTable([
      ["Loan number", opts.loanNumber],
      ["Total repayable", amount],
    ])}
      <p style="margin: 0;">Your repayment schedule is now available on your dashboard. Please review the maturity date and ensure you repay on time.</p>
      ${renderBanner({
      tone: "success",
      title: "Receipt attached",
      body: "A PDF receipt with the full details of this disbursement is attached to this email.",
    })}
    `,
    contentText: `Hi ${opts.firstName},

Your loan ${opts.loanNumber} has been disbursed.

Total repayable: ${amount}

Your repayment schedule is now available on your dashboard. A PDF receipt is attached to this email.`,
    cta: {
      label: "View your loan",
      url: `${env.PUBLIC_FRONTEND_URL}/loans`,
    },
  });

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: opts.to,
    subject: `Your loan ${opts.loanNumber} has been disbursed`,
    text,
    html,
    attachments: [
      {
        filename: `Receipt-${opts.loanNumber}.pdf`,
        content: opts.pdf,
        contentType: "application/pdf",
      },
    ],
  });
}

// import nodemailer from "nodemailer";

// import { env } from "../config/env.js";

// /*
//  * ============================================================
//  * EMAIL TRANSPORTER
//  * ============================================================
//  */

// const transporter = nodemailer.createTransport({
//   host: env.SMTP_HOST,

//   port: env.SMTP_PORT,

//   secure: env.SMTP_PORT === 465,

//   auth: {
//     user: env.SMTP_USER,
//     pass: env.SMTP_PASSWORD,
//   },
// });


// /*
//  * ============================================================
//  * VERIFY EMAIL CONNECTION
//  * ============================================================
//  */

// export async function verifyEmailConnection(): Promise<void> {
//   await transporter.verify();

//   console.log(
//     "✅ Gmail SMTP connection successful"
//   );
// }

// export async function sendSignedApplicationEmail(opts: {
//   to: string;
//   firstName: string;
//   applicationNumber: string;
//   pdf: Buffer;
// }) {
//   await transporter.sendMail({
//     from: env.EMAIL_FROM,
//     to: opts.to,
//     subject: `Your signed loan application — ${opts.applicationNumber}`,
//     text:
//       `Hi ${opts.firstName},\n\n` +
//       `Your signed loan application ${opts.applicationNumber} is attached.\n\n` +
//       `Keep this document — it is your record of the terms you agreed to.\n\n` +
//       `— PesaMaishaCapital`,
//     html: `
//       <!DOCTYPE html>
//       <html><body>
//         <h2>Your signed application</h2>
//         <p>Hi ${opts.firstName},</p>
//         <p>
//           Your signed loan application <strong>${opts.applicationNumber}</strong>
//           is attached to this email.
//         </p>
//         <p>
//           Keep this document — it is your record of the terms you agreed to.
//         </p>
//         <p>— PesaMaishaCapital</p>
//       </body></html>
//     `,
//     attachments: [
//       {
//         filename: `Application-${opts.applicationNumber}.pdf`,
//         content: opts.pdf,
//         contentType: "application/pdf",
//       },
//     ],
//   });
// }

// /*
//  * ============================================================
//  * SEND ACCOUNT VERIFICATION EMAIL
//  * ============================================================
//  *
//  * Used during registration.
//  */

// export async function sendVerificationEmail(
//   email: string,
//   otp: string
// ): Promise<void> {

//   await transporter.sendMail({
//     from: env.EMAIL_FROM,

//     to: email,

//     subject:
//       "Verify your PesaMaishaCapital account",

//     text:
//       `Your verification code is ${otp}. ` +
//       `This code expires in ` +
//       `${env.OTP_EXPIRES_IN_MINUTES} minutes.`,

//     html: `
//       <!DOCTYPE html>

//       <html>
//         <body>

//           <h2>
//             Verify your PesaMaishaCapital account
//           </h2>

//           <p>
//             Your verification code is:
//           </p>

//           <h1>
//             ${otp}
//           </h1>

//           <p>
//             This code expires in
//             ${env.OTP_EXPIRES_IN_MINUTES}
//             minutes.
//           </p>

//           <p>
//             If you did not create this
//             account, please ignore this email.
//           </p>

//         </body>
//       </html>
//     `,
//   });
// }


// /*
//  * ============================================================
//  * SEND GENERAL EMAIL
//  * ============================================================
//  *
//  * This is used by the notification system for:
//  *
//  * - Loan approved
//  * - Loan rejected
//  * - Loan disbursed
//  * - Repayment reminder
//  * - Overdue notification
//  * - Payment received
//  * - Other system notifications
//  */

// export async function sendEmail(
//   email: string,
//   subject: string,
//   message: string,
// ): Promise<void> {

//   await transporter.sendMail({
//     from: env.EMAIL_FROM,

//     to: email,

//     subject,

//     text: message,

//     html: `
//       <!DOCTYPE html>

//       <html>
//         <body>

//           <h2>
//             ${subject}
//           </h2>

//           <p>
//             ${message}
//           </p>

//           <p>
//             Regards,<br />
//            PesaMaishaCapital
//           </p>

//         </body>
//       </html>
//     `,
//   });
// }

// /*
//  * Send a general application notification email.
//  *
//  * Used for:
//  *
//  * - Loan repayment reminders
//  * - Overdue loan notifications
//  * - Loan approval
//  * - Loan rejection
//  * - Loan disbursement
//  * - Payment confirmation
//  */
// export async function sendLoanNotificationEmail(
//   email: string,
//   title: string,
//   message: string,
// ): Promise<void> {
//   await transporter.sendMail({
//     from: env.EMAIL_FROM,
//     to: email,
//     subject: title,

//     /*
//      * Plain-text version.
//      */
//     text: message,

//     /*
//      * HTML version.
//      */
//     html: `
//       <!DOCTYPE html>
//       <html>
//         <body>
//           <h2>${title}</h2>

//           <p>
//             ${message}
//           </p>

//           <p>
//            PesaMaishaCapital
//           </p>
//         </body>
//       </html>
//     `,
//   });
// }
// /* ============================================================
//  * ACCOUNT LOCKED
//  * ============================================================ */
// export async function sendAccountLockedEmail(
//   email: string,
//   firstName: string,
//   lockedUntil: Date,
// ): Promise<void> {
//   const untilStr = lockedUntil.toUTCString();

//   await transporter.sendMail({
//     from: env.EMAIL_FROM,
//     to: email,
//     subject: "Your account has been locked",
//     text:
//       `Hi ${firstName},\n\n` +
//       `Your account has been temporarily locked after 4 failed login attempts.\n` +
//       `It will automatically unlock at ${untilStr}.\n\n` +
//       `If this wasn't you, please contact support immediately.`,
//     html: `
//       <!DOCTYPE html>
//       <html>
//         <body>
//           <h2>Account locked</h2>
//           <p>Hi ${firstName},</p>
//           <p>
//             Your account has been temporarily locked after
//             <strong>4 failed login attempts</strong>.
//           </p>
//           <p>
//             It will automatically unlock at
//             <strong>${untilStr}</strong>.
//           </p>
//           <p>
//             If this wasn't you, please contact support immediately.
//           </p>
//           <p>— PesaMaishaCapital</p>
//         </body>
//       </html>
//     `,
//   });
// }

// /* ============================================================
//  * ACCOUNT UNLOCKED (by admin)
//  * ============================================================ */
// export async function sendAccountUnlockedEmail(
//   email: string,
//   firstName: string,
// ): Promise<void> {
//   await transporter.sendMail({
//     from: env.EMAIL_FROM,
//     to: email,
//     subject: "Your account has been unlocked",
//     text:
//       `Hi ${firstName},\n\n` +
//       `An administrator has unlocked your account. You can now log in again.`,
//     html: `
//       <!DOCTYPE html>
//       <html>
//         <body>
//           <h2>Account unlocked</h2>
//           <p>Hi ${firstName},</p>
//           <p>
//             An administrator has unlocked your account.
//             You can now log in again.
//           </p>
//           <p>— PesaMaishaCapital</p>
//         </body>
//       </html>
//     `,
//   });
// }
// /* ============================================================
//  * PASSWORD RESET EMAIL
//  * ============================================================ */
// export async function sendPasswordResetEmail(
//   email: string,
//   firstName: string,
//   code: string,
//   ttlMinutes: number,
// ): Promise<void> {
//   await transporter.sendMail({
//     from: env.EMAIL_FROM,
//     to: email,
//     subject: "Reset your PesaMaishaCapital account password",
//     text:
//       `Hi ${firstName},\n\n` +
//       `Your password reset code is: ${code}\n\n` +
//       `This code expires in ${ttlMinutes} minutes.\n\n` +
//       `If you didn't request this, please ignore this email — your password ` +
//       `will not change.`,
//     html: `
//       <!DOCTYPE html>
//       <html>
//         <body>
//           <h2>Reset your password</h2>
//           <p>Hi ${firstName},</p>
//           <p>Your password reset code is:</p>
//           <h1 style="letter-spacing:4px;font-family:monospace;">${code}</h1>
//           <p>This code expires in <strong>${ttlMinutes} minutes</strong>.</p>
//           <p>
//             If you didn't request this, please ignore this email —
//             your password will not change.
//           </p>
//           <p>— PesaMaishaCapital</p>
//         </body>
//       </html>
//     `,
//   });
// }

// /* ============================================================
//  * DISBURSEMENT RECEIPT EMAIL (with PDF attachment)
//  * ============================================================ */
// export async function sendDisbursementReceiptEmail(opts: {
//   to: string;
//   firstName: string;
//   loanNumber: string;
//   totalAmount: number;
//   pdf: Buffer;
// }): Promise<void> {
//   await transporter.sendMail({
//     from: env.EMAIL_FROM,
//     to: opts.to,
//     subject: `Your loan ${opts.loanNumber} has been disbursed`,
//     text:
//       `Hi ${opts.firstName},\n\n` +
//       `Your loan ${opts.loanNumber} of KES ${opts.totalAmount.toLocaleString()} ` +
//       `has been disbursed. Please find your receipt attached.\n\n` +
//       `Repayment is due according to the schedule in your dashboard.\n\n` +
//       `— PesaMaishaCapital`,
//     html: `
//       <!DOCTYPE html>
//       <html>
//         <body>
//           <h2>Your loan has been disbursed</h2>
//           <p>Hi ${opts.firstName},</p>
//           <p>
//             Your loan <strong>${opts.loanNumber}</strong> of
//             <strong>KES ${opts.totalAmount.toLocaleString()}</strong>
//             has been disbursed.
//           </p>
//           <p>Please find your receipt attached to this email.</p>
//           <p>Repayment is due according to the schedule in your dashboard.</p>
//           <h3>— PesaMaishaCapital</h3>
//         </body>
//       </html>
//     `,
//     attachments: [
//       {
//         filename: `Receipt-${opts.loanNumber}.pdf`,
//         content: opts.pdf,
//         contentType: "application/pdf",
//       },
//     ],
//   });
// }