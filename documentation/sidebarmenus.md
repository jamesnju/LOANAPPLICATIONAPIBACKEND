Yes. Based on the APIs you currently have and the roles in your Prisma schema, I would **not give every role the same sidebar**. The sidebar should be generated from permissions so each user sees only what they need.

Your roles are:

```text
SUPER_ADMIN
ADMIN
LOAN_OFFICER
FINANCE_OFFICER
SUPPORT
CUSTOMER
```

A good UI structure would be the following.

# 1. SUPER_ADMIN Sidebar

The Super Admin manages the entire platform.

```text
Dashboard

System Management
├── System Configuration
├── Loan Products
└── System Health

User Management
├── All Users
├── Administrators
├── Loan Officers
├── Finance Officers
└── Support Staff

Loan Management
├── All Applications
├── Active Loans
├── Overdue Loans
├── Completed Loans
└── Loan Status

KYC & Documents
├── KYC Reviews
├── Documents
├── Document Reviews
└── Rejected Documents

Financial Management
├── Payments
├── Disbursements
├── Loan Transactions
└── Repayment Schedules

Customers
├── Customer List
├── Guarantors
└── Collateral

Reports
├── Loan Reports
├── Repayment Reports
├── Payment Reports
├── Customer Reports
└── Application Reports

Notifications
├── All Notifications
└── Notification History

Audit & Security
├── Audit Logs
└── Security Events

My Account
├── Profile
├── Change Password
└── Logout
```

### API mapping

| Sidebar              | API                        |
| -------------------- | -------------------------- |
| Dashboard            | `/admin/dashboard`         |
| System Configuration | `/system-config`           |
| Loan Products        | `/loan-products`           |
| Users                | `/users`                   |
| KYC Reviews          | `/admin/kyc`               |
| Applications         | `/admin/loan-applications` |
| Loans                | `/loans`                   |
| Repayments           | `/repayment-schedules`     |
| Payments             | `/payments`                |
| Transactions         | `/loan-transactions`       |
| Documents            | `/documents`               |
| Guarantors           | `/guarantors`              |
| Collateral           | `/collateral`              |
| Reports              | `/reports`                 |
| Notifications        | `/notifications`           |
| Audit Logs           | `/audit-logs`              |

---

# 2. ADMIN Sidebar

Admin handles day-to-day system operations but doesn't need the same level of system control as Super Admin.

```text
Dashboard

Customers
├── All Customers
├── Active Customers
└── Suspended Customers

Loan Management
├── Loan Applications
├── Active Loans
├── Overdue Loans
└── Completed Loans

KYC & Documents
├── KYC Review
├── Documents
└── Document Review

Loan Products
├── Products
└── Product Settings

Financial
├── Payments
├── Repayment Schedules
└── Transactions

Guarantors & Collateral
├── Guarantors
└── Collateral

Reports
├── Loan Reports
├── Payment Reports
├── Repayment Reports
└── Customer Reports

Notifications

Audit Logs

User Management
├── Users
└── Staff

My Account
├── Profile
├── Change Password
└── Logout
```

One important distinction:

```text
SUPER_ADMIN
    ↓
Can manage system configuration + sensitive administration

ADMIN
    ↓
Can operate the platform
```

---

# 3. LOAN_OFFICER Sidebar

The Loan Officer should have a **credit-review-focused dashboard**.

```text
Dashboard

Applications
├── New Applications
├── Under Review
├── Documents Required
├── Pending Approval
├── Approved
├── Rejected
└── Cancelled

KYC
├── Pending KYC
├── Under Review
├── Approved
└── Rejected

Documents
├── Pending Review
├── Verified
└── Rejected

Customer Assessment
├── Customers
├── Guarantors
└── Collateral

Loans
├── Active Loans
├── Overdue Loans
└── Loan Details

Reports
├── Application Reports
├── KYC Reports
└── Loan Portfolio

Notifications

My Account
├── Profile
├── Change Password
└── Logout
```

### Their main workflow

```text
Dashboard
    ↓
New Applications
    ↓
Open Application
    ↓
Review Customer
    ↓
Review KYC
    ↓
Review Documents
    ↓
Review Guarantors
    ↓
Review Collateral
    ↓
Make/forward application decision
```

This role should **not** see things such as:

```text
System Configuration
User Roles
System Security
```

unless your business specifically wants them to.

---

# 4. FINANCE_OFFICER Sidebar

This sidebar should revolve around **money movement**.

```text
Dashboard

Disbursements
├── Pending Disbursement
├── Disbursed
└── Failed Disbursements

Loans
├── Active Loans
├── Overdue Loans
├── Partially Paid
└── Fully Paid

Repayments
├── Upcoming Repayments
├── Due Today
├── Overdue
└── Completed

Payments
├── All Payments
├── Completed
├── Pending
├── Failed
└── Reversed

Transactions
├── All Transactions
├── Disbursements
├── Repayments
├── Fees
├── Interest
└── Adjustments

Reports
├── Disbursement Reports
├── Payment Reports
├── Repayment Reports
└── Transaction Reports

Notifications

My Account
├── Profile
├── Change Password
└── Logout
```

The Finance Officer's main journey becomes:

```text
Approved Applications
       ↓
Pending Disbursement
       ↓
Disburse
       ↓
Active Loan
       ↓
Monitor Repayments
       ↓
Payments
       ↓
Fully Paid
```

---

# 5. SUPPORT Sidebar

Support should have a **customer-service-focused** interface.

```text
Dashboard

Customers
├── Customer Search
├── Customer Details
└── Customer Activity

Applications
├── Application Search
└── Application Details

KYC
├── KYC Status
└── KYC Details

Documents
├── Application Documents
└── Document Status

Loans
├── Active Loans
├── Repayment Status
└── Loan Details

Guarantors & Collateral
├── Guarantor Information
└── Collateral Information

Notifications
└── Customer Notifications

My Account
├── Profile
├── Change Password
└── Logout
```

Support should generally be **read-oriented**.

For example:

```text
SUPPORT
   │
   ├── View customer ✓
   ├── View application ✓
   ├── View KYC ✓
   ├── View loan ✓
   ├── View repayment ✓
   │
   ├── Approve KYC ✗
   ├── Approve loan ✗
   ├── Disburse ✗
   └── Modify financial transactions ✗
```

---

# 6. CUSTOMER Sidebar

The customer's sidebar should be much simpler.

```text
Dashboard

My Profile
└── Profile

KYC Verification
├── My KYC
└── KYC Documents

My Applications
├── New Application
├── Drafts
├── Submitted
├── Under Review
├── Approved
└── Application History

My Loans
├── Active Loan
├── Loan History
└── Loan Details

Repayments
├── Repayment Schedule
├── Upcoming Payments
├── Payment History
└── Make Payment

Documents
├── Application Form
├── My Documents
└── Upload Document

Guarantors
└── My Guarantors

Collateral
└── My Collateral

Notifications
└── My Notifications

Help & Support
└── Contact Support

Account
├── Profile
├── Security
└── Logout
```

---

# 7. Customer dashboard

I would make the customer dashboard card-based.

```text
┌─────────────────────────────────────────────┐
│ Good morning, James                        │
│                                             │
│ KYC Status        ✓ Approved                │
│                                             │
│ Active Loan                                  │
│ KSh 2,500                                    │
│                                             │
│ Outstanding                                  │
│ KSh 1,400                                    │
│                                             │
│ Next Payment                                 │
│ KSh 1,400                                    │
│ Due: 10 Oct                                  │
└─────────────────────────────────────────────┘

Quick Actions

[ Apply for Loan ]
[ Make Payment ]
[ View Schedule ]
[ Upload Document ]
```

If the customer doesn't have a loan:

```text
┌──────────────────────────────┐
│ No active loan               │
│                              │
│ You can apply for a loan.    │
│                              │
│ [ Apply for Loan ]           │
└──────────────────────────────┘
```

---

# 8. Recommended sidebar icons

You can make the sidebar visually easier to understand.

| Module        | Icon idea       |
| ------------- | --------------- |
| Dashboard     | LayoutDashboard |
| Customers     | Users           |
| Applications  | FileText        |
| Loans         | Wallet          |
| KYC           | BadgeCheck      |
| Documents     | Files           |
| Guarantors    | UserCheck       |
| Collateral    | Shield          |
| Payments      | CreditCard      |
| Repayments    | Calendar        |
| Transactions  | ArrowLeftRight  |
| Disbursement  | Send            |
| Reports       | BarChart        |
| Notifications | Bell            |
| Users         | UsersRound      |
| System Config | Settings        |
| Audit Logs    | History         |
| Support       | Headphones      |
| Profile       | User            |
| Security      | Lock            |

If you're using **Lucide React**, these icons fit nicely.

---

# 9. Role → Module matrix

This is probably the **most important part for your frontend implementation**.

`✓` = should have access
`R` = read-only
`—` = hide from sidebar

| Module          | Super Admin | Admin | Loan Officer | Finance Officer | Support | Customer |
| --------------- | :---------: | :---: | :----------: | :-------------: | :-----: | :------: |
| Dashboard       |      ✓      |   ✓   |       ✓      |        ✓        |    ✓    |     ✓    |
| System Config   |      ✓      |   ✓   |       —      |        —        |    —    |     —    |
| Loan Products   |      ✓      |   ✓   |       R      |        R        |    —    |     R    |
| User Management |      ✓      |   ✓   |       —      |        —        |    —    |     —    |
| KYC             |      ✓      |   ✓   |       ✓      |        R        |    R    |     ✓    |
| Applications    |      ✓      |   ✓   |       ✓      |        R        |    R    |     ✓    |
| Documents       |      ✓      |   ✓   |       ✓      |        R        |    R    |     ✓    |
| Guarantors      |      ✓      |   ✓   |       ✓      |        R        |    R    |     ✓    |
| Collateral      |      ✓      |   ✓   |       ✓      |        R        |    R    |     ✓    |
| Loans           |      ✓      |   ✓   |       ✓      |        ✓        |    R    |     ✓    |
| Repayments      |      ✓      |   ✓   |       R      |        ✓        |    R    |     ✓    |
| Payments        |      ✓      |   ✓   |       R      |        ✓        |    R    |     ✓    |
| Transactions    |      ✓      |   ✓   |       R      |        ✓        |    R    |     ✓    |
| Loan Status     |      ✓      |   ✓   |       ✓      |        ✓        |    R    |     R    |
| Notifications   |      ✓      |   ✓   |       ✓      |        ✓        |    ✓    |     ✓    |
| Reports         |      ✓      |   ✓   |       ✓      |        ✓        |    R    |     —    |
| Audit Logs      |      ✓      |   ✓   |       R      |        R        |    —    |     —    |
| Admin Dashboard |      ✓      |   ✓   |       —      |        —        |    —    |     —    |
| Support         |      ✓      |   ✓   |       —      |        —        |    ✓    |     ✓    |

The **R** permissions should generally not mean the frontend alone disables buttons. The backend must enforce the permission too.

---

# 10. I would actually organize your frontend into 5 major sidebar groups

Instead of showing 20+ items directly, use collapsible groups.

### ADMIN/SUPER_ADMIN

```text
MAIN
├── Dashboard

CUSTOMERS
├── Customers
├── KYC
└── Documents

LOANS
├── Applications
├── Loans
├── Repayments
├── Payments
└── Transactions

OPERATIONS
├── Guarantors
├── Collateral
├── Disbursements
└── Notifications

ADMINISTRATION
├── Users
├── Loan Products
├── System Configuration
├── Reports
└── Audit Logs
```

### LOAN OFFICER

```text
MAIN
└── Dashboard

CREDIT
├── Applications
├── KYC Reviews
├── Documents
├── Guarantors
└── Collateral

LOANS
├── Active Loans
└── Overdue Loans

REPORTS
└── Loan Reports

SYSTEM
└── Notifications
```

### FINANCE OFFICER

```text
MAIN
└── Dashboard

FINANCE
├── Pending Disbursements
├── Payments
├── Repayments
└── Transactions

LOANS
├── Active Loans
├── Overdue Loans
└── Fully Paid

REPORTS
├── Payment Reports
├── Repayment Reports
└── Transaction Reports

SYSTEM
└── Notifications
```

### SUPPORT

```text
MAIN
└── Dashboard

CUSTOMERS
└── Customers

LOANS
├── Applications
├── Loans
└── Repayments

DOCUMENTS
├── KYC
└── Documents

SYSTEM
├── Notifications
└── Help
```

### CUSTOMER

```text
MAIN
├── Dashboard
└── My Profile

LOAN
├── Apply for Loan
├── My Applications
└── My Loans

REPAYMENTS
├── Repayment Schedule
├── Make Payment
└── Payment History

VERIFICATION
├── KYC
├── Documents
├── Guarantors
└── Collateral

SYSTEM
├── Notifications
├── Help & Support
└── Logout
```

---

# 11. One missing frontend/backend concept I recommend

Your API list is good, but for this sidebar architecture I'd add a **Permissions/Role Access endpoint** eventually.

For example:

```http
GET /api/v1/auth/me
```

Response:

```json id="c6fj9a"
{
  "success": true,
  "data": {
    "id": "7b9f3d20-8c51-4e91-8f1d-5e0e1a2b3344",
    "firstName": "Peter",
    "lastName": "Kamau",
    "email": "peter@example.com",
    "role": "LOAN_OFFICER",
    "permissions": [
      "KYC_VIEW",
      "KYC_REVIEW",
      "APPLICATION_VIEW",
      "APPLICATION_REVIEW",
      "DOCUMENT_VIEW",
      "DOCUMENT_VERIFY",
      "DOCUMENT_REJECT",
      "GUARANTOR_VIEW",
      "COLLATERAL_VIEW"
    ]
  }
}
```

Then the frontend can build the sidebar from the user's role/permissions.

The important architecture is:

```text
                    LOGIN
                      ↓
                /auth/me
                      ↓
             User + Role + Permissions
                      ↓
              Frontend Sidebar
                      ↓
       ┌──────────────┼──────────────┐
       ↓              ↓              ↓
    Customer     Loan Officer     Finance
       ↓              ↓              ↓
 Customer UI      Credit UI      Finance UI
```

But remember: **sidebar hiding is only a UI feature**. Your existing `authenticate` + `authorize(...)` middleware must remain the actual security boundary.

### One additional module worth adding later

For a production-grade loan platform, I'd also consider a **Customer Support/Tickets module**:

```text
Support
├── Tickets
├── Open
├── In Progress
├── Resolved
└── Customer Messages
```

That isn't represented in your current `app.ts`, so it would require a new API/module. Everything else above can largely be built around the APIs you already have.
