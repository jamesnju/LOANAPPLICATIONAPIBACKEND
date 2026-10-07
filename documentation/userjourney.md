Yes. Based on the `app.ts` you shared, you have **most of the major modules required for the complete loan lifecycle**. The important thing now is to understand how all those APIs work together from **initial system setup → customer registration → KYC → loan application → approval → disbursement → repayment → closure**, and what each role does.

I would structure the system journey like this.

# 1. Overall system journey

```text
                         ┌─────────────────────┐
                         │    SUPER ADMIN      │
                         │ System Configuration│
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┼────────────────┐
                    ▼               ▼                ▼
             System Config    Loan Products     Staff Users
                    │               │                │
                    └───────────────┼────────────────┘
                                    ▼
                         ┌─────────────────────┐
                         │       CUSTOMER      │
                         │ Register / Verify   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                              Complete KYC
                                    │
                                    ▼
                          Create Loan Application
                                    │
                    ┌───────────────┼────────────────┐
                    ▼               ▼                ▼
               Documents        Guarantors       Collateral
                    │               │                │
                    └───────────────┼────────────────┘
                                    ▼
                           Submit Application
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    LOAN OFFICER     │
                         │ Review Application  │
                         └──────────┬──────────┘
                                    │
                         ┌──────────┴──────────┐
                         ▼                     ▼
                     Reject              Approve/Review
                         │                     │
                         ▼                     ▼
                    Customer              Loan Approval
                    Corrects                    │
                         │                      ▼
                         └──────────────► FINANCE OFFICER
                                               │
                                               ▼
                                         Disbursement
                                               │
                                               ▼
                                        Active Loan
                                               │
                                               ▼
                                      Repayment Schedule
                                               │
                                               ▼
                                          Payments
                                               │
                                               ▼
                                      Fully Paid Loan
```

---

# 2. Roles in your system

Your current role structure is:

| Role              | Main responsibility                                                |
| ----------------- | ------------------------------------------------------------------ |
| `SUPER_ADMIN`     | Complete system administration                                     |
| `ADMIN`           | Day-to-day administration                                          |
| `LOAN_OFFICER`    | KYC/application/document review and loan decisions                 |
| `FINANCE_OFFICER` | Disbursement, payments and financial operations                    |
| `SUPPORT`         | Customer/application support                                       |
| `CUSTOMER`        | KYC, applications, documents, guarantors, collateral and repayment |

The important distinction is that **not every role should be able to perform every operation**.

---

# 3. Stage 1 — Initial system setup

This happens before customers start applying.

## SUPER_ADMIN

The first person is the `SUPER_ADMIN`.

They configure the system.

### Step 1 — Configure system settings

API:

```text
/system-config
```

Examples:

```text
LOAN_MIN_AMOUNT = 500
LOAN_MAX_AMOUNT = 3000
LOAN_MIN_REPAYMENT_DAYS = 7
LOAN_MAX_REPAYMENT_DAYS = 30
DEFAULT_INTEREST_RATE = 10
DEFAULT_PROCESSING_FEE = 50
MAX_ACTIVE_LOANS = 1
OTP_EXPIRATION_MINUTES = 10
```

Example:

```http
POST /api/v1/system-config
```

```json
{
  "key": "LOAN_MAX_AMOUNT",
  "name": "Maximum Loan Amount",
  "description": "Maximum amount a customer can request",
  "type": "INTEGER",
  "value": "3000",
  "category": "LOANS",
  "isEditable": true,
  "isActive": true
}
```

---

# 4. Create loan products

SUPER_ADMIN/ADMIN creates the loan products.

```http
POST /api/v1/loan-products
```

Example:

```json
{
  "name": "KopaFlex Starter Loan",
  "description": "Short-term starter loan",
  "minAmount": 500,
  "maxAmount": 3000,
  "minRepaymentDays": 7,
  "maxRepaymentDays": 30,
  "interestRate": 10,
  "processingFee": 50,
  "isActive": true
}
```

The system now has:

```text
KopaFlex Starter Loan
---------------------
Minimum: KSh 500
Maximum: KSh 3,000
Repayment: 7–30 days
Interest: 10%
Processing fee: KSh 50
```

---

# 5. Create staff users

SUPER_ADMIN creates the internal users.

For example:

```text
Jane → ADMIN
Peter → LOAN_OFFICER
Mary → FINANCE_OFFICER
David → SUPPORT
```

API:

```text
/users
```

The result is:

```text
                 SUPER ADMIN
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
     ADMIN       LOAN OFFICER   FINANCE OFFICER
                                     
                      SUPPORT
```

---

# 6. System is now ready

At this point:

```text
System Configuration ✓
Loan Products ✓
Staff Accounts ✓
Authentication ✓
Email ✓
Database ✓
KYC ✓
Documents ✓
Applications ✓
Approval ✓
Disbursement ✓
Repayments ✓
Notifications ✓
Audit Logs ✓
Reports ✓
```

Now customers can enter the system.

---

# 7. Stage 2 — Customer registration

Customer opens the frontend.

For example:

> James wants to borrow KSh 2,500.

He selects:

```text
Create Account
```

API:

```http
POST /api/v1/auth/register
```

Example:

```json
{
  "firstName": "James",
  "lastName": "Muniu",
  "email": "james@example.com",
  "phone": "+254700000000",
  "password": "********"
}
```

System creates:

```text
User
Status → ACTIVE
Email verified → false
Phone verified → false
Role → CUSTOMER
```

---

# 8. OTP verification

The system sends an OTP.

```text
James
  ↓
OTP
  ↓
Email/SMS
  ↓
Verify
```

API:

```text
/auth/verify-otp
```

After successful verification:

```text
Email verified ✓
Phone verified ✓
```

The customer can now log in.

---

# 9. Customer login

```http
POST /api/v1/auth/login
```

The response contains the access token/refresh mechanism you've implemented.

The frontend stores the appropriate authentication state.

Then:

```text
Customer Login
      ↓
Check KYC
      ↓
KYC incomplete?
   ┌──┴──┐
   │     │
  YES    NO
   │     │
   ▼     ▼
KYC page Dashboard
```

The customer can choose **Later**, but that should not bypass KYC when they actually attempt to apply.

---

# 10. Stage 3 — Customer KYC

James goes to:

```text
Complete KYC
```

API:

```text
/kyc
```

He enters information such as:

```json
{
  "identificationType": "NATIONAL_ID",
  "identificationNumber": "12345678",
  "dateOfBirth": "2000-01-01",
  "gender": "MALE",
  "employmentType": "EMPLOYED"
}
```

Then uploads identification documents.

```text
KYC
 │
 ├── Personal information
 ├── Identification
 └── Documents
```

---

# 11. Loan Officer reviews KYC

Loan Officer logs into:

```text
/admin/kyc
```

They see:

```text
Pending KYC
------------------------------
James Muniu
National ID
Documents: 2
Status: UNDER_REVIEW
```

They review the information.

### If valid

```text
KYC → APPROVED
```

### If something is wrong

```text
KYC → REJECTED
```

with a reason.

The customer receives a notification.

---

# 12. Stage 4 — Customer creates loan application

James now selects:

```text
Apply for Loan
```

Frontend calls:

```http
POST /api/v1/loan-applications
```

Example:

```json
{
  "productId": "starter-loan-id",
  "requestedAmount": 2500,
  "repaymentDays": 14,
  "purpose": "Business stock",
  "notes": "Purchase additional stock"
}
```

Application is initially:

```text
DRAFT
```

---

# 13. Customer completes application

Now James completes the additional application information.

### Application document

He clicks:

```text
Download Application Form
```

API:

```http
GET /api/v1/documents/application-template
```

He downloads:

```text
PesaMaishaCapital_TemplateForm.docx
```

He fills it in.

Then:

```text
Upload Completed Form
```

```http
POST /api/v1/documents/application/:applicationId/upload
```

Document becomes:

```text
PENDING
```

---

# 14. Guarantor

If required, James adds a guarantor.

```http
POST /api/v1/guarantors
```

Example:

```json
{
  "loanApplicationId": "application-id",
  "fullName": "John Kamau",
  "phone": "+254722222222",
  "nationalId": "12345678",
  "relationship": "Friend",
  "occupation": "Business Owner"
}
```

---

# 15. Collateral

If the product requires collateral, James adds it.

```http
POST /api/v1/collateral
```

Example:

```json
{
  "loanApplicationId": "application-id",
  "type": "VEHICLE",
  "description": "Toyota Probox",
  "estimatedValue": 850000
}
```

---

# 16. Customer reviews application

Frontend displays:

```text
APPLICATION SUMMARY
--------------------------------

Loan Product:
KopaFlex Starter Loan

Requested Amount:
KSh 2,500

Repayment:
14 days

Purpose:
Business stock

KYC:
✓ Approved

Application Form:
✓ Uploaded

Guarantor:
✓ Added

Collateral:
Not required

--------------------------------

[ Submit Application ]
```

James clicks:

```text
Submit Application
```

Application changes:

```text
DRAFT
  ↓
SUBMITTED
```

---

# 17. Stage 5 — Loan Officer review

Loan Officer opens:

```text
/admin/loan-applications
```

They see:

```text
APPLICATION #00124

Customer:
James Muniu

Amount:
KSh 2,500

Product:
KopaFlex Starter

KYC:
✓ Approved

Application Form:
✓ Verified

Guarantor:
✓ Available

Status:
SUBMITTED
```

The officer can move the application through the review process.

```text
SUBMITTED
    ↓
UNDER_REVIEW
    ↓
DOCUMENTS_REQUIRED (if needed)
    ↓
PENDING_APPROVAL
```

---

# 18. Document rejection example

Suppose the Loan Officer notices James forgot to sign the form.

They use:

```http
PATCH /api/v1/documents/:id/reject
```

```json
{
  "rejectionReason": "Applicant signature is missing."
}
```

Document:

```text
PENDING
   ↓
REJECTED
```

James receives:

```text
Your application document requires correction.

Reason:
Applicant signature is missing.
```

James uploads the corrected document.

```text
REJECTED
   ↓
New document
   ↓
PENDING
   ↓
Loan Officer reviews
   ↓
VERIFIED
```

---

# 19. Stage 6 — Loan approval

Once everything is satisfactory:

```text
Application
     ↓
PENDING_APPROVAL
```

The authorized officer performs the approval action.

Your loan application approval APIs handle this.

Conceptually:

```text
SUBMIT
  ↓
REVIEW
  ↓
APPROVE
```

The system records:

```text
LoanApproval
AuditLog
Notification
```

Application:

```text
APPROVED
```

---

# 20. Maker-checker concept

Your system can maintain separation between the person who reviews/prepares and the person who approves.

For example:

```text
Peter
LOAN_OFFICER
     │
     │ reviews
     ▼
Application
     │
     ▼
Mary
authorized approver
     │
     │ approves
     ▼
APPROVED
```

This is important for financial systems because one person should not necessarily control the entire lifecycle.

---

# 21. Stage 7 — Loan creation

After approval, the approved application becomes an actual loan.

Conceptually:

```text
Loan Application
       ↓
APPROVED
       ↓
Loan created
       ↓
PENDING_DISBURSEMENT
```

Loan:

```text
Loan ID: LN-000124
Customer: James Muniu
Principal: KSh 2,500
Interest: KSh 250
Fee: KSh 50
```

---

# 22. Stage 8 — Finance Officer disbursement

Now the `FINANCE_OFFICER` takes over.

They see:

```text
PENDING DISBURSEMENTS

LN-000124
James Muniu
KSh 2,500
```

They verify the financial information and disburse.

Your:

```text
/loans
/payments
/loan-transactions
```

modules handle the financial side.

The transaction is recorded:

```text
Transaction:
DISBURSEMENT

Amount:
KSh 2,500
```

Loan:

```text
PENDING_DISBURSEMENT
        ↓
      ACTIVE
```

---

# 23. Repayment schedule is generated

Once the loan is active:

```text
Loan
 ↓
Repayment Schedule
```

Example:

```text
Loan Amount:        KSh 2,500
Interest:           KSh 250
Processing Fee:     KSh 50

Total Due:          KSh 2,800

Repayment Period:   14 days
```

The repayment schedule could look like:

```text
Due Date       Amount
--------------------------------
10 Oct         KSh 1,400
17 Oct         KSh 1,400
```

Your API:

```text
/repayment-schedules
```

handles this.

---

# 24. Stage 9 — Repayment

James sees:

```text
MY LOAN

Loan: LN-000124
Status: ACTIVE

Outstanding:
KSh 2,800

Next payment:
KSh 1,400

Due:
10 Oct 2026
```

He makes a payment.

For example:

```text
M-Pesa
KSh 1,400
```

The payment API records:

```text
Payment
Status → COMPLETED
```

Then:

```text
Loan Transaction
Type → REPAYMENT
```

and the repayment schedule becomes:

```text
PARTIALLY_PAID
```

if there is still money outstanding.

---

# 25. Background jobs

Your current `loan.jobs.ts` monitors the loan system.

For example:

```text
Every hour
    ↓
Check maturity dates
    ↓
Find overdue loans
```

And:

```text
Every day
    ↓
Find repayments due in 5 days
    ↓
Send notification
```

Example:

```text
James's repayment due:
15 October

Job runs:
10 October

Difference:
5 days

        ↓

IN_APP notification
        +
EMAIL notification
```

Eventually this can also include SMS.

---

# 26. Overdue loan

Suppose James does not pay by the maturity date.

Background job:

```text
ACTIVE
  ↓
Maturity date reached
  ↓
Outstanding balance > 0
  ↓
OVERDUE
```

The customer receives:

```text
Your loan is overdue.
Outstanding balance: KSh 1,400.
```

The system creates:

```text
Notification
Loan Status update
Audit Log
```

---

# 27. Stage 10 — Full repayment

James eventually pays the remaining:

```text
KSh 1,400
```

System calculates:

```text
Outstanding = 0
```

Loan becomes:

```text
FULLY_PAID
```

The repayment schedule becomes:

```text
PAID
```

The transaction is recorded:

```text
REPAYMENT
```

The customer receives:

```text
Your loan LN-000124 has been fully repaid.
```

---

# 28. What each role sees

## SUPER_ADMIN

```text
Login
  ↓
System Configuration
  ↓
Loan Products
  ↓
Users
  ↓
Roles
  ↓
Reports
  ↓
Audit Logs
  ↓
Dashboard
```

They manage the **system itself**.

---

## ADMIN

```text
Login
  ↓
Dashboard
  ↓
Users
  ↓
Loan Products
  ↓
KYC
  ↓
Applications
  ↓
Documents
  ↓
Reports
```

They manage **day-to-day administration**.

---

## LOAN_OFFICER

```text
Login
  ↓
Dashboard
  ↓
Pending KYC
  ↓
Review KYC
  ↓
Pending Applications
  ↓
Review Documents
  ↓
Review Guarantors
  ↓
Review Collateral
  ↓
Application Decision
```

They focus on **credit/application assessment**.

---

## FINANCE_OFFICER

```text
Login
  ↓
Dashboard
  ↓
Approved Loans
  ↓
Pending Disbursement
  ↓
Disburse
  ↓
Monitor Payments
  ↓
Review Transactions
  ↓
Handle Financial Records
```

They focus on **money movement**.

---

## SUPPORT

```text
Login
  ↓
Customer lookup
  ↓
View application
  ↓
View KYC/application status
  ↓
View documents
  ↓
View notifications
  ↓
Assist customer
```

Support should generally **not approve loans or perform financial operations**.

---

## CUSTOMER

```text
Register
  ↓
Verify OTP
  ↓
Login
  ↓
KYC
  ↓
Create Application
  ↓
Download Form
  ↓
Fill Form
  ↓
Upload Form
  ↓
Guarantor / Collateral
  ↓
Submit
  ↓
Wait for Review
  ↓
Approval
  ↓
Disbursement
  ↓
Repayment
  ↓
Fully Paid
```

---

# 29. Complete example

Let's put the entire thing together with one customer.

### System

SUPER_ADMIN creates:

```text
Product:
KopaFlex Starter Loan

Maximum:
KSh 3,000

Repayment:
7–30 days

Interest:
10%
```

---

### Customer

James registers:

```text
James Muniu
Email: james@example.com
Phone: +254700000000
```

Verifies OTP.

---

### KYC

James submits:

```text
National ID
Employment information
Personal information
Identification document
```

Loan Officer approves:

```text
KYC → APPROVED
```

---

### Application

James requests:

```text
Amount: KSh 2,500
Repayment: 14 days
Purpose: Business stock
```

Application:

```text
DRAFT
```

He downloads:

```text
PesaMaishaCapital_TemplateForm.docx
```

fills it and uploads it.

Then adds:

```text
Guarantor:
John Kamau
```

Application becomes:

```text
SUBMITTED
```

---

### Review

Loan Officer:

```text
KYC ✓
Application ✓
Document ✓
Guarantor ✓
```

Application:

```text
UNDER_REVIEW
        ↓
PENDING_APPROVAL
        ↓
APPROVED
```

---

### Finance

Finance Officer sees:

```text
Loan:
LN-000124

Amount:
KSh 2,500

Status:
PENDING_DISBURSEMENT
```

Disburses.

```text
Loan
PENDING_DISBURSEMENT
        ↓
ACTIVE
```

---

### Repayment

System creates:

```text
Total repayment:
KSh 2,800
```

James pays:

```text
Payment 1 = KSh 1,400
Payment 2 = KSh 1,400
```

Finally:

```text
Outstanding = KSh 0
```

Loan:

```text
FULLY_PAID
```

---

# 30. API coverage based on your `app.ts`

You currently mount these **17 functional API groups plus health**:

| Module               | Route                      | Lifecycle role     |
| -------------------- | -------------------------- | ------------------ |
| Authentication       | `/auth`                    | All users          |
| System Config        | `/system-config`           | Super Admin/Admin  |
| Loan Products        | `/loan-products`           | Admin              |
| Customer KYC         | `/kyc`                     | Customer           |
| Admin KYC            | `/admin/kyc`               | Staff              |
| Loan Applications    | `/loan-applications`       | Customer           |
| Admin Applications   | `/admin/loan-applications` | Staff              |
| Application Approval | `/loan-applications`       | Loan Officer/Admin |
| Loans                | `/loans`                   | Finance/Admin      |
| Repayment Schedules  | `/repayment-schedules`     | Finance/Customer   |
| Payments             | `/payments`                | Customer/Finance   |
| Loan Transactions    | `/loan-transactions`       | Finance/Admin      |
| Loan Status          | `/loan-status`             | Staff/system       |
| Notifications        | `/notifications`           | All users          |
| Audit Logs           | `/audit-logs`              | Admin/Super Admin  |
| Admin Dashboard      | `/admin/dashboard`         | Staff              |
| Reports              | `/reports`                 | Staff              |
| Users                | `/users`                   | Admin              |
| Guarantors           | `/guarantors`              | Customer/Staff     |
| Collateral           | `/collateral`              | Customer/Staff     |
| Documents            | `/documents`               | Customer/Staff     |

So from the **mounted routes**, you have a strong coverage of the core loan lifecycle.

## APIs I would specifically verify before calling the backend complete

The `app.ts` only tells us which **routers** exist, not every endpoint inside them. Therefore, these are things I would check inside the individual route files:

### 1. Customer profile

I recommend having:

```http
GET /api/v1/auth/me
```

or:

```http
GET /api/v1/users/me
```

So the frontend can retrieve the currently logged-in customer's profile without knowing their user ID.

---

### 2. Logout / refresh-token management

Make sure `/auth` contains:

```text
POST /auth/login
POST /auth/register
POST /auth/verify-otp
POST /auth/refresh
POST /auth/logout
```

If refresh tokens are stored in the database, logout should revoke/delete the appropriate refresh token.

---

### 3. Password management

You should have:

```text
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/change-password
```

depending on your existing authentication implementation.

---

### 4. KYC document upload

You have `/kyc`, but verify that it supports the complete:

```text
Create KYC
Update KYC
Upload KYC document
Get my KYC
Submit KYC
```

and admin:

```text
Get pending KYC
Review KYC
Approve KYC
Reject KYC
Request documents
```

---

### 5. Payment callback/webhook

**This is particularly important if you will integrate M-Pesa.**

You should eventually have something similar to:

```text
POST /api/v1/payments/mpesa/callback
```

The M-Pesa callback should:

```text
M-Pesa
   ↓
Callback
   ↓
Validate transaction
   ↓
Find payment
   ↓
Mark payment COMPLETED
   ↓
Create LoanTransaction
   ↓
Update RepaymentSchedule
   ↓
Update Loan
   ↓
Notification
   ↓
Audit Log
```

The callback should **not** simply trust an amount or user ID supplied by the frontend.

---

### 6. Disbursement integration

If you eventually disburse through M-Pesa, you will also need a proper disbursement integration/callback flow rather than only changing the loan status.

---

### 7. Customer loan history

Make sure customers can retrieve:

```text
My applications
My active loans
My completed loans
My repayment schedules
My payments
My transactions
My notifications
```

For example:

```text
GET /api/v1/loan-applications/my
GET /api/v1/loans/my
GET /api/v1/payments/my
GET /api/v1/notifications/my
```

The exact names can differ from your implementation.

---

# 31. One thing I would change in your `app.ts`

You currently have **two 404 handlers and two error handlers**.

You have:

```ts
app.use(notFoundHandler);
app.use(errorHandler);
```

and then later:

```ts
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});
```

and another:

```ts
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    ...
  }
);
```

You should keep **one global 404 handler and one global error handler**.

So your ending should effectively be:

```ts
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
```

That avoids having two competing error-handling implementations.

Also, because you have:

```ts
if (env.NODE_ENV !== 'production') {
  startLoanJobs();
}
```

your current `node-cron` jobs run only in non-production. That's consistent with the architecture you showed earlier, but before production you'll need the separate scheduler/worker mechanism we discussed.

**The next thing I would do before adding more modules is audit each of the 21 mounted routers against this journey and produce a single endpoint checklist showing `implemented / missing / needs modification`.** That will tell us exactly what remains instead of creating duplicate APIs.
