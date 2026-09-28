Below is a short API reference based on the modules we have defined. I’ve kept the examples consistent with your loan platform structure and role-based access.

# Loan Platform — API Documentation

**Base URL**

```text
/api/v1
```

Authentication uses:

```http
Authorization: Bearer <access_token>
```

---

# 1. Notifications

Notifications inform users about application updates, loan disbursements, repayments, and other events.

### Get My Notifications

```http
GET /api/v1/notifications
```

**Access:** Authenticated users

### Sample Response

```json
{
  "success": true,
  "data": [
    {
      "id": "9f3c1e6b-1234-4567-8901-abcdef123456",
      "type": "LOAN_DISBURSED",
      "channel": "IN_APP",
      "title": "Loan Disbursed",
      "message": "Your loan of KSh 3,000 has been disbursed.",
      "isRead": false,
      "createdAt": "2026-09-28T10:30:00.000Z"
    }
  ]
}
```

### Get Unread Notifications

```http
GET /api/v1/notifications/unread
```

### Mark Notification as Read

```http
PATCH /api/v1/notifications/:id/read
```

### Mark All as Read

```http
PATCH /api/v1/notifications/read-all
```

### Delete Notification

```http
DELETE /api/v1/notifications/:id
```

---

# 2. SystemConfig CRUD

System configuration stores values that can be changed without modifying application code, such as minimum loan amount, maximum loan amount, repayment days and interest rate.

**Access:** `ADMIN`, `SUPER_ADMIN`

### Create Configuration

```http
POST /api/v1/system-config
```

### Sample Request

```json
{
  "key": "LOAN_MAX_AMOUNT",
  "name": "Maximum Loan Amount",
  "description": "Maximum amount a customer can apply for",
  "type": "DECIMAL",
  "value": "3000",
  "defaultValue": "3000",
  "category": "LOAN",
  "isEditable": true,
  "isActive": true
}
```

### Sample Response

```json
{
  "success": true,
  "message": "System configuration created successfully",
  "data": {
    "id": "4a6b8d2e-1234-4567-8901-abcdef123456",
    "key": "LOAN_MAX_AMOUNT",
    "name": "Maximum Loan Amount",
    "type": "DECIMAL",
    "value": "3000",
    "category": "LOAN",
    "isActive": true
  }
}
```

### Get All Configurations

```http
GET /api/v1/system-config
```

### Get Configuration

```http
GET /api/v1/system-config/:id
```

### Update Configuration

```http
PUT /api/v1/system-config/:id
```

### Sample Request

```json
{
  "value": "5000"
}
```

### Delete Configuration

```http
DELETE /api/v1/system-config/:id
```

**Access:** `SUPER_ADMIN`

---

# 3. Audit Logs

Audit logs record important actions performed within the system, such as login, approval, rejection, disbursement and repayment.

**Access:** `ADMIN`, `SUPER_ADMIN`

### Get Audit Logs

```http
GET /api/v1/audit-logs
```

### Sample Response

```json
{
  "success": true,
  "data": [
    {
      "id": "8a4c2d10-1234-4567-8901-abcdef123456",
      "userId": "user-123",
      "action": "APPROVE",
      "entity": "LoanApplication",
      "entityId": "application-456",
      "description": "Loan application approved",
      "createdAt": "2026-09-28T09:20:00.000Z"
    }
  ]
}
```

### Get Single Audit Log

```http
GET /api/v1/audit-logs/:id
```

### Filter Audit Logs

```http
GET /api/v1/audit-logs?action=APPROVE&entity=LoanApplication
```

Example:

```text
GET /api/v1/audit-logs?action=DISBURSE
```

---

# 4. Background Jobs

Background jobs perform automated system tasks without requiring a user to trigger them manually.

These jobs run internally and normally **do not expose public HTTP endpoints**.

### Current Jobs

| Job                      | Frequency | Purpose                                                |
| ------------------------ | --------- | ------------------------------------------------------ |
| Update Overdue Schedules | Hourly    | Marks unpaid repayment schedules as overdue            |
| Update Overdue Loans     | Hourly    | Marks loans past maturity as overdue                   |
| Repayment Reminders      | Daily     | Finds repayments due in 5 days and sends notifications |

### Example Automated Reminder

When a repayment is approaching:

```text
Loan due date: October 3, 2026
Current date: September 28, 2026
```

The system can create:

```json
{
  "type": "REPAYMENT_DUE",
  "channel": "IN_APP",
  "title": "Repayment Due Soon",
  "message": "Your loan repayment is due in 5 days."
}
```

Email/SMS delivery can also be triggered by the notification service.

### Job Startup

Jobs are started automatically when the backend server starts.

```text
Server starts
     ↓
Background jobs start
     ↓
Hourly overdue check
     ↓
Daily repayment reminder
```

---

# 5. Admin Dashboard APIs

The dashboard provides administrators with a summary of the current state of the loan platform.

**Access:** `ADMIN`, `SUPER_ADMIN`

### Get Dashboard

```http
GET /api/v1/admin/dashboard
```

### Sample Response

```json
{
  "success": true,
  "data": {
    "customers": {
      "total": 1250
    },
    "applications": {
      "total": 840,
      "pending": 120,
      "approved": 560,
      "rejected": 160
    },
    "loans": {
      "total": 560,
      "active": 430,
      "overdue": 45,
      "fullyPaid": 85
    },
    "financial": {
      "totalDisbursed": "1680000.00",
      "totalCollected": "1245000.00",
      "totalOutstanding": "435000.00"
    },
    "recentApplications": [],
    "recentPayments": []
  }
}
```

The frontend can use this single endpoint to populate cards, tables and dashboard statistics.

---

# 6. Reports

Reports provide administrators and finance/loan officers with detailed information about applications, loans and payments.

**Access:** `ADMIN`, `SUPER_ADMIN`, `FINANCE_OFFICER`, `LOAN_OFFICER`

---

## Loan Portfolio Report

```http
GET /api/v1/reports/loans
```

### Optional Filters

```text
GET /api/v1/reports/loans?startDate=2026-09-01&endDate=2026-09-28
```

### Sample Response

```json
{
  "success": true,
  "data": {
    "totalLoans": 560,
    "activeLoans": 430,
    "overdueLoans": 45,
    "fullyPaidLoans": 85,
    "totalPrincipal": "1680000.00",
    "totalOutstanding": "435000.00"
  }
}
```

---

## Payment Report

```http
GET /api/v1/reports/payments
```

### Sample Request

```text
GET /api/v1/reports/payments?startDate=2026-09-01&endDate=2026-09-28
```

### Sample Response

```json
{
  "success": true,
  "data": {
    "totalPayments": 320,
    "totalAmount": "1245000.00",
    "payments": [
      {
        "id": "payment-123",
        "loanId": "loan-456",
        "amount": "3000.00",
        "method": "MPESA",
        "status": "COMPLETED",
        "paidAt": "2026-09-28T08:30:00.000Z"
      }
    ]
  }
}
```

---

## Overdue Loan Report

```http
GET /api/v1/reports/overdue
```

### Sample Response

```json
{
  "success": true,
  "data": {
    "totalOverdueLoans": 45,
    "totalOutstanding": "135000.00",
    "loans": [
      {
        "id": "loan-123",
        "customerId": "customer-456",
        "principalAmount": "3000.00",
        "outstandingBalance": "3000.00",
        "maturityDate": "2026-09-20T00:00:00.000Z",
        "status": "OVERDUE"
      }
    ]
  }
}
```

---

## Loan Application Report

```http
GET /api/v1/reports/applications
```

### Sample Request

```text
GET /api/v1/reports/applications?startDate=2026-09-01&endDate=2026-09-28
```

### Sample Response

```json
{
  "success": true,
  "data": {
    "totalApplications": 840,
    "submitted": 120,
    "underReview": 80,
    "approved": 560,
    "rejected": 80
  }
}
```

---

## Overall API Structure

Your backend is now roughly organized like this:

```text
/api/v1
│
├── auth
├── users
├── kyc
├── loan-products
├── loan-applications
├── loans
├── repayments
├── payments
│
├── notifications
├── system-config
├── audit-logs
│
├── admin
│   └── dashboard
│
└── reports
    ├── loans
    ├── payments
    ├── overdue
    └── applications
```

**Important distinction:** `SystemConfig`, `Notifications`, `Audit Logs`, `Admin Dashboard`, and `Reports` are HTTP API modules, while **Background Jobs are internal scheduled processes** that support those APIs and automate things like overdue detection and repayment reminders.
