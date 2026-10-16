# PesaMaishaCapital — Project Handoff for the Next AI Agent

**Purpose of this document:** Give the next AI agent (or developer) enough context to continue the project without re-reading every file. Assume the reader is technically competent but has zero prior context.

---

## 1. What the product is

A **digital lending platform for the Kenyan market**. Customers apply for short-term loans online, get approved by admins, receive funds via M-Pesa, and repay via M-Pesa STK Push. The system is regulatory-aware (KYC, audit trails, e-signature, credit reference bureau reporting).

**Target users:**
- **Customers** — apply for loans, view schedules, make payments, download statements.
- **Admins / Loan Officers / Finance Officers** — review applications, approve/reject, disburse loans, reconcile payments, run reports.
- **Super Admin** — everything above plus user role management, system configuration.

**Core flow:**
```
Register → KYC → Apply for loan → Sign online → Admin review →
Approve → Create loan → Disburse via M-Pesa → Repay via STK Push →
Fully paid
```

The **old flow** (customer downloads a `.docx`, fills it in Word, uploads it) has been **replaced with an online signing flow** — see §3.

---

## 2. Tech stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router, Turbopack) + TypeScript, Tailwind v4, `next-auth` v5 (Auth.js), `react-hot-toast`, `lucide-react`, `recharts` |
| **Backend** | Node.js + Express 5 + TypeScript, Prisma ORM, PostgreSQL (Supabase / Neon / Railway) |
| **Auth** | NextAuth v5 on the frontend, JWT access tokens + refresh tokens on the backend |
| **Storage** | Cloudinary (images / ID photos) |
| **Email** | Nodemailer via Gmail SMTP |
| **PDFs** | PDFKit |
| **Payments** | Safaricom Daraja API — M-Pesa STK Push (Lipa Na M-Pesa Online) |
| **Background jobs** | `node-cron` locally, Vercel Cron / external cron in production |
| **Deployment** | Frontend on Vercel, backend on Vercel (should migrate to Render/Fly/Railway — see §8) |

**Monorepo-ish structure:**
```
backend/     Express API
frontend/    Next.js app
```

---

## 3. What's been built (feature inventory)

### Authentication
- Email/password registration with OTP verification (email or SMS).
- Google OAuth login (NextAuth provider).
- Password reset via OTP.
- **Account lockout** — after 4 failed logins, the account is locked for 4 hours. Admin can unlock manually. Auto-unlock on expiry.
- **Session expiry** — NextAuth cookie `maxAge` aligned with backend `REFRESH_TOKEN_EXPIRES_IN` (recommended 8h). JWT callback refreshes the access token on each request; if refresh fails, `AuthGuard` signs the user out.
- **Google-vs-password unification** — a single User row serves both login methods. `intent: "login" | "register"` distinguishes the two flows. On the **login** page, Google login for an unknown email is refused (must register first). On the **register** page, Google login creates the account.

### User profile
- Customers and admins can view/edit their own profile.
- Change password (revokes all refresh tokens).
- Profile page under `/profile`, shared by both roles.

### KYC
- Customer submits KYC with ID documents (front + back).
- Admin reviews: approve / reject / request more docs.
- KYC must be `APPROVED` before the customer can apply for a loan.

### Loan products (admin CRUD)
- Product definition: min/max amount, min/max repayment days, interest rate, processing fee, late penalty rate.
- Enabled/disabled flag.

### Loan applications (customer)
- **Online-only flow** (the `.docx` upload is deprecated for new applications):
  1. **Step 1** — Loan details (product, amount, days, purpose).
  2. **Step 2** — National ID (front + back images).
  3. **Step 3** — Guarantors (with their IDs).
  4. **Step 4** — Collateral (optional; with photos).
  5. **Step 5** — Review & Sign.
- **Resume-draft** — if the customer abandons, they resume where they left off.
- **Eligibility gate** — cannot start a new application while they have an active loan or an open application. Blocked both at the page and at the API.

### E-signature (the big change)
- **Terms & Conditions** are versioned, immutable documents.
- Admin creates/edits/publishes/deletes versions. Every save creates a new version; the old version is never edited.
- **Signing step** — customer:
  - Reads the terms in a scrollable pane (must scroll to the bottom to enable signing).
  - Types their full legal name (paste is blocked).
  - Checks three consents: Terms, Privacy, Debit mandate.
  - Clicks "Sign and submit."
- **Signature record** stores:
  - `documentHash` (SHA-256 of the canonical signed payload).
  - `termsVersion` and `termsHash` (which terms version was agreed to).
  - `ipAddress`, `userAgent`, `signedAt`, `signatureData` (typed name).
- **Signed PDF** is generated on demand from the data — never stored. Includes:
  - Customer details (name, email, phone, national ID, DOB, gender, employment).
  - **Customer National ID images** (front + back).
  - Loan terms.
  - **All guarantors** with their IDs, contact details, guaranteed amounts.
  - **Guarantor National ID images** (front + back for each).
  - **All collateral** with photos.
  - **The full terms text** the customer agreed to.
  - Signature block + SHA-256 integrity hash.
- **Unsigned PDF** — same layout but with a diagonal "UNSIGNED" watermark so it can't be passed off as executed.
- **Verification** — anyone (public, no auth) can visit `/verify-signature?hash=...` to verify authenticity. Endpoint: `GET /signatures/verify?hash=...`. Tampering with the `signedPayload` JSON in the DB breaks the verification.

### Loans
- **Create loan** — from an APPROVED application (admin action).
- **Disburse loan** — records the disbursement transaction, calculates maturity, flips status.
- **Repayment schedule** — one installment per loan (bullet repayment). Generated at disbursement.
- **Disbursement receipt** — on-demand PDF, emailed to the customer.
- **Notifications** — in-app and email on approval, rejection, disbursement, payment received.

### Payments (M-Pesa STK Push)
- **Initiate** — customer enters phone + amount, backend calls Safaricom.
- **Callback** — Safaricom POSTs to `/api/v1/payments/mpesa/callback` with the outcome.
- **Apply to loan** — allocates the payment to the schedule, updates `amountPaid`/`outstandingAmount`, inserts a `LoanTransaction`, flips loan status to `PARTIALLY_PAID` or `FULLY_PAID`.
- **Frontend polling** — polls payment status until terminal, shows success/cancel/fail with distinct UI states.
- **Idempotency** — callbacks can arrive twice; the second is a no-op.
- **Reconciliation** — a job queries Safaricom for stuck `PENDING` requests and resolves them. Manual reconciliation via admin UI.
- **Admin reconciliation tool** — search by checkoutRequestId, phone, or receipt. Query Safaricom live, manually resolve with a receipt, or mark as failed.

### Reminders & overdue
- **Repayment reminders** — daily job that sends reminders at configurable days-before-maturity. Currently hardcoded `[7, 3, 1, 0]`; intended to become admin-configurable via `SystemConfig`.
- **Overdue detection** — hourly job marks loans as `OVERDUE` past maturity and notifies the customer.
- **Overdue schedules** — flips installment statuses.

### Reports
- **Admin reports** (with CSV/PDF export):
  - Loan portfolio
  - Payments
  - Overdue loans
  - Applications
- **Customer reports**:
  - Account statement (full ledger across all loans)
  - Loan summary
  - Payment history
- Exports use the same `renderReportPdf` / `toCsv` helpers.

### Admin analytics
- Overview KPIs (customers, loans, collections, portfolio at risk) with period-over-period deltas.
- Time series (disbursements, collections, applications, new customers) — daily buckets.
- Product performance breakdown.
- Cohort analysis by month.
- Activity feed (merged loans/payments/applications/KYC).

### Ops console
- Admin page at `/ops` lists available background jobs and lets admins trigger them on demand.
- Every run is audited (who, when, duration, result).
- Job history view.

### Background jobs
- `runLoanOverdueJob` — mark overdue loans.
- `runOverdueSchedulesJob` — mark overdue installments.
- `runRepaymentRemindersJob` — send reminders.
- `reconcilePendingStkRequests` — reconcile stuck M-Pesa payments.

### Notifications
- In-app: `Notification` table with type, title, message, metadata.
- Email: `sendLoanNotificationEmail` + specific emails (lock, unlock, password reset, verification, disbursement receipt, signed application).
- **Known issue:** `notifyUser` currently only sends email — SMS channel is stubbed but not wired.

### Admin user management
- List users with filters and pagination.
- Create users.
- Edit profile, status, role.
- Unlock locked accounts.
- View a user's applications and loans.

### SEO / UX
- Metadata via `buildMetadata`.
- Theme toggle (light default, dark optional), persisted in `localStorage`.
- Mobile-responsive throughout — all pages.
- Idle session timeout with warning modal.
- WhatsApp floating button on the landing page.

---

## 4. Data model (key tables)

Prisma models you'll interact with most:

| Model | Purpose |
|---|---|
| `User` | All accounts (customers + staff). Roles via enum. |
| `Kyc` | KYC record per customer. |
| `KycDocument` | ID images uploaded during KYC. |
| `LoanProduct` | Product definitions. |
| `LoanApplication` | Customer applications. Status: DRAFT → SUBMITTED → … → APPROVED / REJECTED. |
| `ApplicationSignature` | **New.** Records the e-signature with hash, terms version, IP, UA. |
| `TermsDocument` | **New.** Versioned, immutable terms text. One row per version. |
| `Guarantor` | A guarantor for an application. Has front + back ID docs. |
| `Collateral` | Collateral items. Has photos. |
| `Document` | Generic document record (used for all uploads). |
| `LoanApproval` | Approval history for applications. |
| `Loan` | The actual loan. Status: PENDING_DISBURSEMENT → ACTIVE → FULLY_PAID / OVERDUE. |
| `LoanTransaction` | Ledger for each loan (disbursement, repayment, penalty). |
| `RepaymentSchedule` | Installments (currently one per loan). |
| `Payment` | Payment attempts. |
| `MpesaStkRequest` | Tracks an STK Push request from initiate to callback. |
| `Notification` | In-app notifications. |
| `AuditLog` | Every significant action. |
| `SystemConfig` | Key-value config (loan limits, reminder windows, etc.). |
| `RefreshToken` | Hashed refresh tokens for session management. |
| `OtpCode` | OTPs for verification + password reset. |

**Important enums:**
- `UserStatus` — ACTIVE, INACTIVE, SUSPENDED, BLOCKED, LOCKED.
- `Role` — SUPER_ADMIN, ADMIN, LOAN_OFFICER, FINANCE_OFFICER, SUPPORT, CUSTOMER.
- `ApplicationStatus` — DRAFT, SUBMITTED, UNDER_REVIEW, DOCUMENTS_REQUIRED, PENDING_APPROVAL, APPROVED, REJECTED, CANCELLED, DISBURSED.
- `LoanStatus` — PENDING_DISBURSEMENT, ACTIVE, PARTIALLY_PAID, FULLY_PAID, OVERDUE, DEFAULTED, WRITTEN_OFF, CANCELLED.
- `DocumentType` — many values; the key ones are `NATIONAL_ID_FRONT`, `NATIONAL_ID_BACK`, `GUARANTOR_ID_FRONT`, `GUARANTOR_ID_BACK`.
- `SignatureMethod` — TYPED_NAME, DRAWN, OTP_CONFIRMED.

---

## 5. Project structure (frontend)

```
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/                   login, register, forgot-password, verify
│   │   ├── (main)/
│   │   │   ├── (customer)/           dashboard, loans, applyloan, kyc, reports, profile
│   │   │   ├── (admin)/              users, loanapplications, kyc, allloans,
│   │   │   │                         analytics, reconciliation, reports, ops,
│   │   │   │                         settings/terms, settings/reminders
│   │   │   └── profile/              shared profile page
│   │   ├── verify-signature/         public verification page
│   │   └── terms/                    public terms page
│   ├── auth.ts                       NextAuth config
│   ├── components/
│   │   ├── admin/                    admin-only components
│   │   ├── customer/                 customer-only components
│   │   ├── layout/                   shared shells
│   │   └── providers/                SessionProvider, AuthGuard, IdleSession
│   ├── serverqueries/
│   │   ├── http.ts                   authedFetch, authedFetchPublic, errorMessage
│   │   ├── actions/                  server actions
│   │   └── queries/                  server readers
│   ├── hooks/                        useLogout, cacheTags
│   ├── lib/                          auth-token, kyc, nav, seo, sessionConfig
│   └── types/                        shared TypeScript types
```

---

## 6. Project structure (backend)

```
backend/
├── src/
│   ├── app.ts                        Express app; mounts routes; server bootstrap
│   ├── server.ts                     (if separate — starts jobs)
│   ├── config/                       env, prisma, database
│   ├── controllers/                  one per feature
│   ├── routes/                       one per feature
│   ├── services/                     business logic
│   ├── schemas/                      Zod schemas
│   ├── middleware/                   auth, role, error, upload
│   ├── jobs/                         loan.jobs.ts, reconcilePayments.job.ts
│   ├── utils/                        csv, pdfReport, applicationPdf, fetchImage, jwt, otp
│   └── generated/prisma/             Prisma client (custom output dir)
└── prisma/
    └── schema.prisma
```

**Conventions:**
- Every service throws `new Error("Human-readable")` on failure.
- Controllers catch and map errors to HTTP responses.
- Zod schemas validate every request body and query.
- Audit log entries go through `logAction`.
- Notifications go through `notifyUser`.

---

## 7. What's currently working end-to-end

✅ Register + OTP verify + login (password or Google)
✅ KYC submission and admin review
✅ Loan application wizard (5 steps, online-only)
✅ **E-signature with terms versioning**
✅ Signed PDF with images, terms, hash
✅ Public signature verification
✅ Admin approval workflow
✅ Loan creation + disbursement
✅ Disbursement receipt PDF + email
✅ Repayment schedule (single bullet)
✅ M-Pesa STK Push initiation + callback
✅ Payment application to loan
✅ Admin reconciliation tool (search, query Safaricom, manual resolve, mark failed)
✅ Ops console with job triggers
✅ Admin analytics dashboard with charts
✅ Admin report exports (CSV + PDF)
✅ Customer account statements (JSON / CSV / PDF)
✅ Eligibility check (block active loans / open applications)
✅ Notification emails (account locked/unlocked, password reset, disbursement, signed application, review outcomes)
✅ Idle session timeout with warning modal
✅ Light/dark theme toggle
✅ WhatsApp floating button

---

## 8. Known issues, gaps, and unfinished work

### Critical (fix before real customers)

1. **Backend is on Vercel serverless.** This causes:
   - Callbacks can miss because of cold starts.
   - `node-cron` and `setInterval` don't run reliably.
   - Two-environment DB split risk (local + Vercel) if not careful.
   - **Recommended fix:** move the backend to Render / Fly / Railway. Keep the frontend on Vercel.
   - **Alternative:** keep Vercel and use Vercel Cron + external cron (cron-job.org) to trigger jobs.

2. **M-Pesa callback reliability.** The callback sometimes doesn't reach the backend. The `reconcilePendingStkRequests` job is the safety net — but it must be *running* in production. Currently runs via `setInterval` locally only.

3. **Reminder cadence is hardcoded** (`[7, 3, 1, 0]`). Should read from `SystemConfig` so admins can adjust without a deploy. The admin UI for this is planned but not built.

4. **Overdue notification copy** now includes the amount, but reminders should also carry the outstanding balance explicitly.

5. **Safaricom callback IP allowlist** is not implemented. Anyone can POST a fake successful callback to the endpoint. Add Safaricom's production IPs to the middleware.

6. **Cloudinary documents are public by default.** ID photos should be private, served via signed URLs. Configure the Cloudinary account or generate signed URLs on delivery.

### Important

7. **No Sentry or error tracking.** Production errors only surface in Vercel logs. Add `@sentry/node` + `@sentry/nextjs`.

8. **No uptime monitoring.** Add UptimeRobot on `/api/v1/health` and Healthchecks.io on the cron jobs.

9. **`notifyUser` only sends email.** SMS is stubbed. For reminders, SMS is often more effective than email in Kenya.

10. **Statements and receipts use `renderReportPdf`** but the layout is minimal. Could be improved with the customer name, loan details, and a signature line.

11. **No rate limiting on STK Push.** A malicious authenticated customer can spam the endpoint. Add `express-rate-limit` — 5 requests/minute per user.

12. **No admin-initiated STK Push.** Common support flow: customer calls, admin sends a prompt. The service exists; add a controller + button.

13. **Payment reversal.** If a payment is duplicated or wrong, there's no way to reverse it. Add a `POST /payments/:id/reverse` endpoint that reverses the `LoanTransaction` and updates the loan.

14. **No CSRF protection on the public verify endpoint.** Low risk, but worth adding a simple token if it becomes a target.

### Nice to have

15. **Automated overdue escalation emails** — daily/weekly if the loan stays past due.

16. **Admin notification preferences.** Right now notifications go to the customer; admins don't get proactive alerts except through the ops console.

17. **Statement PDF styling.** Currently functional; could be branded.

18. **Repayment schedule generation** — still uses one installment per loan. If products ever become multi-installment, this needs to change.

19. **Password strength meter** on registration and reset.

20. **2FA** for admin accounts.

21. **Configurable interest calculation** — currently flat interest. Some products may need daily accrual.

22. **Early payoff quote** — a feature some lenders offer.

23. **Legal review** of the Terms & Conditions by a Kenyan advocate specialising in fintech.

24. **Regulatory filings** — CBK DCP license, credit reference bureau registration, data protection registration.

### Bugs and drift to watch

- **Type drift between frontend and backend enums.** We hit this repeatedly with `UserStatus`, `LoanStatus`, `ApplicationStatus`, `DocumentType`. Consider a codegen step from `schema.prisma` to frontend types.

- **The `.docx` flow is deprecated but not deleted.** `ApplicationDocumentUpload`, `DownloadTemplateButton`, `submitLoanApplication` are still in the codebase. They work but are unused for new applications.

- **`getSignedApplicationPdfController`** may still exist as dead code in `applicationSignature.controller.ts`. Delete it if so.

- **`renderUnsignedApplicationPdf`** lives in `applicationPdf.ts` but the import in `applicationSignature.controller.ts` may still point at `pdfReport.ts`. Confirm imports are correct.

- **Hooks-after-early-return bugs** in `StepTermsAndSign`. Fixed, but watch for similar patterns elsewhere.

---

## 9. Recommended next steps (priority order)

### Immediate (this week)

1. **Move backend off Vercel** to Render/Fly/Railway. 30–60 min migration; eliminates several classes of bugs.
2. **Deploy the reconcile cron** in production. Either via Render's long-running process or via Vercel Cron + external cron service.
3. **Verify the M-Pesa callback is reachable in production.** `curl` the callback URL with a POST body and confirm 200.
4. **Add Sentry** to both frontend and backend. 15 minutes setup, huge value.
5. **Add rate limiting** to STK Push and auth endpoints.
6. **Verify Cloudinary document permissions.**

### Short-term (this month)

7. **Admin-configurable reminder schedule** — the UI is partly sketched (in earlier conversation); build the `SystemConfig` read/write, wire it into the reminder job, and expose the settings page.
8. **Admin-initiated STK Push** — for support calls.
9. **Payment reversal** — before you have a customer who needs one.
10. **Reconciliation cron verification** — add a health check that runs and reports from the ops console.
11. **Uptime monitoring** on `/api/v1/health`.
12. **SMS notifications** via Africa's Talking or Twilio.

### Medium-term (this quarter)

13. **Legal review** of the Terms.
14. **CBK DCP compliance** review.
15. **Repayment schedule flexibility** — support multi-installment products.
16. **Notification centre UI** on the customer side.
17. **Admin dashboard analytics** beyond what's in the admin report pages.
18. **Statement PDF branding.**
19. **Mobile app or PWA** — the responsive web is close.

---

## 10. Environment variables reference

### Backend

```bash
NODE_ENV=development                # or production
PORT=5000
DATABASE_URL=postgres://...

JWT_ACCESS_SECRET=<32+ chars>
JWT_REFRESH_SECRET=<32+ chars>
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=8h

OTP_EXPIRES_IN_MINUTES=10
OTP_MAX_ATTEMPTS=5

EMAIL_FROM=you@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@example.com
SMTP_PASSWORD=app-specific-password

SMS_PROVIDER=console               # console | africastalking | ...

CLOUDINARYCLOUDNAME=...
CLOUDINARYAPIKEY=...
CLOUDINARYAPISECRET=...

MPESA_ENV=sandbox                  # sandbox | production
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=174379
MPESA_PASSKEY=...
MPESA_CALLBACK_URL=https://api.yourdomain.com/api/v1/payments/mpesa/callback
MPESA_TRANSACTION_TYPE=CustomerPayBillOnline

GOOGLECLIENTID=...
GOOGLECLIENTSECRET=...
GOOGLECALLBACKURL=http://localhost:3000/api/auth/callback/google

ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3000

CRON_SECRET=<32+ chars>            # if using external cron
```

### Frontend

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=<32+ chars>
GOOGLECLIENTID=...
GOOGLECLIENTSECRET=...
```

---

## 11. Testing & deployment

### Local

```bash
# Backend
cd backend
pnpm install
npx prisma generate
npx prisma migrate dev
pnpm dev                # runs on :5000

# Frontend
cd frontend
pnpm install
pnpm dev                # runs on :3000
```

### M-Pesa sandbox

- Shortcode: `174379`
- Passkey: `bfb279f9aa9bdbcf158e97dd71f8e63...` (the published sandbox value)
- Test MSISDN: `254708374149`
- Use `ngrok http 5000` and set `MPESA_CALLBACK_URL` to the ngrok URL for local callback testing.

### Deployment

- **Frontend** → Vercel (production env vars set in project settings).
- **Backend** → Render / Fly / Railway (**recommended**) or Vercel (with Vercel Cron).
- **DB** → Supabase or Neon, with connection pooling (Prisma Accelerate or PgBouncer) for serverless.

---

## 12. Key files the next agent will need

| Purpose | File |
|---|---|
| NextAuth config + lockout subclasses | `frontend/src/auth.ts` |
| Signed application PDF generator | `backend/src/utils/applicationPdf.ts` |
| Application signature service | `backend/src/services/applicationSignature.service.ts` |
| Terms CRUD service | `backend/src/services/terms.service.ts` |
| M-Pesa Daraja client | `backend/src/services/mpesa.service.ts` |
| Payment service (init, apply, callback, reconcile) | `backend/src/services/payment.service.ts` |
| Loan application service | `backend/src/services/loanApplication.service.ts` |
| Loan service (create, disburse) | `backend/src/services/loan.service.ts` |
| Jobs | `backend/src/jobs/loan.jobs.ts`, `backend/src/jobs/reconcilePayments.job.ts` |
| Ops console | `backend/src/controllers/ops.controller.ts` |
| Signature verification UI | `frontend/src/components/customer/signature/SignatureVerifier.tsx` |
| Customer loan detail page | `frontend/src/app/(main)/(customer)/loans/[id]/page.tsx` |
| Admin application detail page | `frontend/src/app/(main)/(admin)/loanapplications/[id]/page.tsx` |
| Server HTTP helpers | `frontend/src/serverqueries/http.ts` |

---

## 13. Working style & conventions

**Frontend:**
- `"use client"` only when needed.
- Server components fetch data directly; use server actions for mutations.
- Every action returns `{ ok: true, data } | { ok: false, error }`.
- `authedFetch` handles auth + 401 retry; `errorMessage` extracts the human-readable error.
- All UI uses CSS variables (`--color-text`, `--color-primary`, etc.).
- Mobile-first: `flex-col sm:flex-row`, `text-xs sm:text-sm`, `px-3 sm:px-4`.

**Backend:**
- Services throw `new Error("...")`. Controllers translate to HTTP.
- Zod validates every request.
- Prisma for all DB access; explicit `select` for public-facing queries.
- Every state change writes an `AuditLog` entry via `logAction`.
- Every notification goes through `notifyUser`.

**Naming:**
- Application number format: `APP-{timestamp}-{random}`.
- Loan number format: `LN-{YYYYMMDD}-{random}`.
- Transaction number format: `TXN-{YYYYMMDD}-{random}`.
- Payment reference format: `PAY-{YYYYMMDD}-{random}`.

---

## 14. Where to look when things go wrong

| Symptom | First place to look |
|---|---|
| Customer can't sign | `StepTermsAndSign.tsx` — check browser console; backend log for `[signApplication] email failed` |
| Signed banner missing on admin/customer page | Backend query include — confirm `signature: true` |
| PDF missing images | `fetchImageBuffer` logs; check Cloudinary URLs; check `imageBuffers` passed to renderer |
| PDF missing terms text | `signature.termsVersion` set? `getApplicationPdfController` loads the terms body? |
| M-Pesa callback not arriving | Vercel function logs; ngrok inspector; Safaricom `stkpushquery` |
| Payment stuck in PENDING | `reconcilePendingStkRequests` running? DB has the STK row? |
| Reminder emails not sending | `runRepaymentRemindersJob` logs — did it find loans? `notifyUser` failing? |
| Lockout not working | `checkAccountLock` / `registerFailedLogin` in `user.service.ts` |
| Session expiring too fast/slow | `frontend/src/auth.ts` `session.maxAge`; backend `REFRESH_TOKEN_EXPIRES_IN` |

---

## 15. Cultural / domain context

- **Currency is KES** (Kenyan Shilling). Format as `KES 1,234` or `KES 1.2M` for large amounts.
- **Phone format** — accept `07XX XXX XXX`, `+2547XX XXX XXX`, or `2547XXXXXXXX`. Normalise to `2547XXXXXXXX` for M-Pesa.
- **Time zone** — Nairobi is UTC+3. All times stored UTC, displayed as `toLocaleString()`.
- **Language** — English is used throughout; some UI copy uses Swahili (*Karibu*, *Pesa*, *Maisha*).
- **Regulations** — CBK DCP Regulations 2022, Data Protection Act 2019, Consumer Protection Act 2012, Credit Reference Bureau Regulations 2020.
- **CRB reporting** — real lenders must report to a licensed credit reference bureau. The code has a `CRB` reference in Terms but no integration yet.

---

## 16. Final advice to the next agent

1. **Read `schema.prisma` first.** It's the ground truth for every relation.
2. **Read `applicationPdf.ts` and `applicationSignature.service.ts` next.** The signing flow is the most recently changed and the most legally sensitive.
3. **Read `payment.service.ts` and `mpesa.service.ts`.** The payment flow has the most edge cases.
4. **Don't trust the console output too much.** The backend logs are noisy with debug statements — clean them up as you go.
5. **The user is pragmatic and moves fast.** They will ask for the next feature before the current one is fully polished. Prioritize working code and clear errors over gold-plating.
6. **The user is on Windows with PowerShell.** Any `curl` command should be offered as `Invoke-RestMethod` too. Better yet, recommend Git Bash.
7. **The user's backend is on Vercel and this is a real problem.** Push the migration to Render/Fly/Railway early. It solves multiple classes of bugs at once.
8. **The user cares about compliance.** E-signatures, audit logs, and retention matter to them. Don't cut corners on those.
9. **The user's frontend is on Vercel and works well.** Leave it there.
10. **When in doubt, ask for the current file and re-read the schema before suggesting a change.** Several bugs in this project came from stale assumptions about what a query or type contained.

---

**End of handoff.** The project is in a solid, mostly-functional state. The biggest remaining risk is production reliability of payments (Vercel serverless + M-Pesa callbacks) and the biggest remaining legal risk is the Terms review by a Kenyan advocate. Everything else is incremental.