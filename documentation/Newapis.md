# API Documentation — New Endpoints

Full reference for every endpoint added or modified across this project. Grouped by feature area, with sample requests, responses, and error cases.

Base URL: `https://loanappbackendapis.vercel.app/api/v1` (or `http://localhost:5000/api/v1` locally)

All authenticated endpoints require a bearer token:

```
Authorization: Bearer <accessToken>
```

---

## Table of Contents

1. [Terms & Conditions](#1-terms--conditions)
2. [Application Signature](#2-application-signature)
3. [Ops Console (Background Jobs)](#3-ops-console-background-jobs)
4. [Admin Analytics](#4-admin-analytics)
5. [Payment Reconciliation](#5-payment-reconciliation)
6. [Customer Reports](#6-customer-reports)
7. [Report Exports (Admin)](#7-report-exports-admin)
8. [Eligibility Check](#8-eligibility-check)

---

# 1. Terms & Conditions

Admins create immutable versions of the terms text. Customers read the currently published version before signing.

### 1.1 Get Published Terms (public)

Returns the currently published version. No authentication required.

```
GET /terms/published
```

**Sample request:**

```bash
curl -X GET "http://localhost:5000/api/v1/terms/published"
```

**Sample response (200):**

```json
{
  "success": true,
  "data": {
    "id": "c1a2b3d4-e5f6-4789-a0b1-c2d3e4f5a6b7",
    "version": 3,
    "label": "Q4 2026 Update",
    "body": "PESAMAISHACAPITAL LOAN AGREEMENT\nTERMS AND CONDITIONS\n\nVersion 3.0\n\n1. DEFINITIONS\n...",
    "contentHash": "afc44f562f59b81cb8cc6051940c35e9996c4b1564233ecc03d84c6d40255ad4",
    "publishedAt": "2026-10-15T08:00:00.000Z"
  }
}
```

**Errors:**

| Status | Body |
|---|---|
| 404 | `{ "success": false, "message": "Terms not yet published" }` |

---

### 1.2 List Terms Versions (admin)

Returns every version, newest first.

```
GET /terms
Authorization: Bearer <admin-token>
```

**Sample response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "c1a2b3d4-...",
      "version": 3,
      "label": "Q4 2026 Update",
      "isPublished": true,
      "contentHash": "afc44f562f...",
      "publishedAt": "2026-10-15T08:00:00.000Z",
      "createdAt": "2026-10-15T07:55:00.000Z",
      "editor": {
        "firstName": "James",
        "lastName": "Muniu",
        "email": "james@pesamaisha.co.ke"
      }
    },
    {
      "id": "d2b3c4e5-...",
      "version": 2,
      "label": "Q3 2026",
      "isPublished": false,
      "contentHash": "b4e8f1a2...",
      "publishedAt": "2026-07-01T09:00:00.000Z",
      "createdAt": "2026-07-01T08:50:00.000Z",
      "editor": {
        "firstName": "James",
        "lastName": "Muniu",
        "email": "james@pesamaisha.co.ke"
      }
    }
  ]
}
```

---

### 1.3 Create Terms Version (admin)

Creates a new immutable version. If `publish: true`, the new version becomes the current one and all previous published versions are unpublished.

```
POST /terms
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Sample request body:**

```json
{
  "label": "Q4 2026 Update",
  "body": "1. DEFINITIONS\n\n1.1 \"We\" means PesaMaishaCapital...\n\n2. ACCEPTANCE\n\n2.1 By submitting...",
  "publish": true
}
```

**Sample response (201):**

```json
{
  "success": true,
  "data": {
    "id": "c1a2b3d4-...",
    "version": 3,
    "label": "Q4 2026 Update",
    "body": "1. DEFINITIONS\n\n1.1 ...",
    "isPublished": true,
    "contentHash": "afc44f562f59b81cb8cc6051940c35e9996c4b1564233ecc03d84c6d40255ad4",
    "editedById": "e7f8a9b0-...",
    "publishedAt": "2026-10-15T08:00:00.000Z",
    "createdAt": "2026-10-15T08:00:00.000Z",
    "updatedAt": "2026-10-15T08:00:00.000Z"
  }
}
```

**Errors:**

| Status | Body |
|---|---|
| 400 | `{ "success": false, "message": "Terms body cannot be empty" }` |
| 401 | `{ "success": false, "message": "Unauthorized" }` |
| 403 | `{ "success": false, "message": "Forbidden" }` |

---

### 1.4 Get Terms by ID (admin)

```
GET /terms/:id
Authorization: Bearer <admin-token>
```

**Sample response (200):**

```json
{
  "success": true,
  "data": {
    "id": "c1a2b3d4-...",
    "version": 3,
    "label": "Q4 2026 Update",
    "body": "1. DEFINITIONS\n\n...",
    "isPublished": true,
    "contentHash": "afc44f562f...",
    "editedById": "e7f8a9b0-...",
    "publishedAt": "2026-10-15T08:00:00.000Z",
    "createdAt": "2026-10-15T08:00:00.000Z",
    "updatedAt": "2026-10-15T08:00:00.000Z",
    "editor": {
      "firstName": "James",
      "lastName": "Muniu",
      "email": "james@pesamaisha.co.ke"
    }
  }
}
```

---

### 1.5 Publish an Existing Version (admin)

Useful for reverting to a prior version. The named version becomes published; all other published versions are unpublished.

```
POST /terms/:id/publish
Authorization: Bearer <admin-token>
```

**Sample request:**

```bash
curl -X POST "http://localhost:5000/api/v1/terms/d2b3c4e5-.../publish" \
  -H "Authorization: Bearer <admin-token>"
```

**Sample response (200):**

```json
{
  "success": true,
  "data": {
    "id": "d2b3c4e5-...",
    "version": 2,
    "label": "Q3 2026",
    "isPublished": true,
    "publishedAt": "2026-10-15T08:30:00.000Z"
  }
}
```

---

### 1.6 Delete a Version (admin)

Only unpublished versions that have never been signed can be deleted. Once a signature exists that references a version, the version is retained forever.

```
DELETE /terms/:id
Authorization: Bearer <admin-token>
```

**Sample response (200):**

```json
{
  "success": true,
  "data": { "deleted": true }
}
```

**Errors:**

| Status | Body |
|---|---|
| 400 | `{ "success": false, "message": "Cannot delete the currently published version. Publish a different version first." }` |
| 400 | `{ "success": false, "message": "This version was signed by 47 customer(s) and cannot be deleted for legal retention." }` |
| 404 | `{ "success": false, "message": "Terms not found" }` |

---

# 2. Application Signature

Customer signs a loan application. Records the customer's typed signature, IP address, user agent, and a SHA-256 hash binding the signature to the exact terms version signed.

### 2.1 Sign Application

```
POST /signatures/:id/sign
Authorization: Bearer <customer-token>
Content-Type: application/json
```

`:id` is the **application ID** (UUID).

**Sample request body:**

```json
{
  "method": "TYPED_NAME",
  "signatureData": "James Muniu",
  "agreedToTerms": true,
  "agreedToPrivacy": true,
  "agreedToDebit": true,
  "termsVersion": 3,
  "termsHash": "afc44f562f59b81cb8cc6051940c35e9996c4b1564233ecc03d84c6d40255ad4"
}
```

**Sample response (200):**

```json
{
  "success": true,
  "data": {
    "signatureId": "7e5a8c3b-...",
    "documentHash": "b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2",
    "signedAt": "2026-10-16T13:07:55.000Z",
    "termsVersion": 3
  }
}
```

**Errors:**

| Status | Body |
|---|---|
| 400 | `{ "success": false, "message": "This application has already been signed." }` |
| 400 | `{ "success": false, "message": "Cannot sign an application in status SUBMITTED." }` |
| 400 | `{ "success": false, "message": "You must agree to all terms before signing." }` |
| 400 | `{ "success": false, "message": "Please type your full name to sign." }` |
| 400 | `{ "success": false, "message": "The terms and conditions have been updated. Please refresh this page and review the current version before signing." }` |
| 400 | `{ "success": false, "message": "Terms and conditions are not available. Please contact support." }` |
| 400 | `{ "success": false, "message": "You must accept the privacy policy." }` |
| 404 | `{ "success": false, "message": "Application not found" }` |

**Side effects:**

- Creates a row in `ApplicationSignature` with the full audit trail (IP, user agent, document hash).
- Flips `LoanApplication.status` from `DRAFT` to `SUBMITTED`, sets `submittedAt`.
- Writes a `LoanApproval` row (`action: SUBMIT`).
- Writes an audit log entry.
- Generates a signed PDF with all images and terms, emails it to the customer (best-effort).

---

### 2.2 Get Signature for an Application

```
GET /signatures/:id/signature
Authorization: Bearer <customer-token>
```

**Sample response (200):**

```json
{
  "success": true,
  "data": {
    "id": "7e5a8c3b-...",
    "applicationId": "531b4119-bcd4-4f75-b198-32bc7caf9e50",
    "userId": "aeb5a810-e8cd-476f-abe9-fb896529558b",
    "documentHash": "b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2",
    "signedPayload": { "...": "..." },
    "method": "TYPED_NAME",
    "signatureData": "James Muniu",
    "agreedToTerms": true,
    "agreedToPrivacy": true,
    "agreedToDebit": true,
    "termsVersion": 3,
    "termsHash": "afc44f562f59b81cb8cc6051940c35e9996c4b1564233ecc03d84c6d40255ad4",
    "ipAddress": "102.68.79.15",
    "userAgent": "Mozilla/5.0 ...",
    "email": "james500muniu@gmail.com",
    "signedAt": "2026-10-16T13:07:55.000Z",
    "createdAt": "2026-10-16T13:07:55.000Z"
  }
}
```

**Errors:**

| Status | Body |
|---|---|
| 404 | `{ "success": false, "message": "Not signed yet" }` |

---

### 2.3 Download Application PDF

Works for both signed and unsigned applications. Signed PDFs include images, terms, and the integrity hash. Unsigned PDFs render with a diagonal "UNSIGNED" watermark.

```
GET /signatures/:id/pdf
Authorization: Bearer <customer-or-admin-token>
```

**Sample request:**

```bash
curl -X GET "http://localhost:5000/api/v1/signatures/531b4119-.../pdf" \
  -H "Authorization: Bearer <customer-token>" \
  -o application.pdf
```

**Sample response:**

`Content-Type: application/pdf`

Binary PDF file. The headers include:

```
Content-Type: application/pdf
Content-Disposition: inline; filename="Application-APP-1792155889546-6933-signed.pdf"
```

**Behaviour:**

| State | Result |
|---|---|
| Signed application | Full PDF with images, terms text, signature block, hash |
| Unsigned application | Same layout plus a diagonal "UNSIGNED" watermark and a "Not yet signed" notice; no signature block or hash |

**Access:**

- Customers can download their own applications.
- Admins (SUPER_ADMIN, ADMIN, LOAN_OFFICER, FINANCE_OFFICER, SUPPORT) can download any application.

**Errors:**

| Status | Body |
|---|---|
| 404 | `{ "success": false, "message": "Application not found" }` |
| 400 | `{ "success": false, "message": "Failed" }` |

---

### 2.4 Verify Signature (public)

No authentication required. Anyone with the hash can verify the authenticity of a signed application.

```
GET /signatures/verify?hash=<sha256-hex>
```

**Sample request:**

```bash
curl -X GET "http://localhost:5000/api/v1/signatures/verify?hash=b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2"
```

**Sample response (200 — valid):**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "signature": {
      "applicationNumber": "APP-1792155889546-6933",
      "customerName": "James Muniu",
      "signedAt": "2026-10-16T13:07:55.000Z",
      "method": "TYPED_NAME",
      "amount": "1000"
    }
  }
}
```

**Sample response (200 — invalid hash, but request succeeded):**

```json
{
  "success": true,
  "data": {
    "valid": false,
    "reason": "No signature found for this hash."
  }
}
```

**Sample response (200 — tampered payload):**

```json
{
  "success": true,
  "data": {
    "valid": false,
    "reason": "Signature hash does not match stored payload — data may have been altered."
  }
}
```

**Errors:**

| Status | Body |
|---|---|
| 400 | `{ "success": false, "message": "Invalid hash format" }` |

---

# 3. Ops Console (Background Jobs)

Admins can trigger operational jobs from a UI instead of waiting for a cron. Every run is audited.

### 3.1 List Available Jobs

```
GET /ops/jobs
Authorization: Bearer <admin-token>
```

**Sample response (200):**

```json
{
  "ok": true,
  "jobs": [
    {
      "key": "send-repayment-reminders",
      "label": "Send repayment reminders",
      "description": "Send a reminder to every customer whose installment is due in 5 days.",
      "category": "Notifications",
      "dangerous": false
    },
    {
      "key": "send-overdue-notifications",
      "label": "Send overdue notifications",
      "description": "Mark loans as overdue and notify the affected customers. Safe to run multiple times.",
      "category": "Notifications",
      "dangerous": false
    },
    {
      "key": "reconcile-payments",
      "label": "Reconcile stuck payments",
      "description": "Query Safaricom for any M-Pesa payment stuck in PENDING and resolve it. Safe to run anytime.",
      "category": "Payments",
      "dangerous": false
    },
    {
      "key": "update-overdue-schedules",
      "label": "Update overdue schedules",
      "description": "Mark past-due repayment installments as OVERDUE.",
      "category": "Loans",
      "dangerous": false
    }
  ]
}
```

---

### 3.2 Run a Job

```
POST /ops/jobs/:key/run
Authorization: Bearer <admin-token>
```

**Sample request:**

```bash
curl -X POST "http://localhost:5000/api/v1/ops/jobs/send-repayment-reminders/run" \
  -H "Authorization: Bearer <admin-token>"
```

**Sample response (200):**

```json
{
  "ok": true,
  "jobKey": "send-repayment-reminders",
  "label": "Send repayment reminders",
  "durationMs": 1243,
  "result": { "sent": 18 }
}
```

**Errors:**

| Status | Body |
|---|---|
| 404 | `{ "ok": false, "message": "Unknown job" }` |
| 500 | `{ "ok": false, "jobKey": "reconcile-payments", "message": "Job failed", "durationMs": 2104 }` |

---

### 3.3 Job History

Returns the 100 most recent job runs from the audit log.

```
GET /ops/jobs/history
Authorization: Bearer <admin-token>
```

**Sample response (200):**

```json
{
  "ok": true,
  "history": [
    {
      "id": "8a7b6c5d-...",
      "userId": "e7f8a9b0-...",
      "action": "OTHER",
      "entity": "OpsJob",
      "entityId": "send-repayment-reminders",
      "description": "Ops job completed: Send repayment reminders",
      "newValue": {
        "jobKey": "send-repayment-reminders",
        "durationMs": 1243,
        "result": { "sent": 18 }
      },
      "createdAt": "2026-10-16T09:15:03.000Z",
      "user": {
        "firstName": "James",
        "lastName": "Muniu",
        "email": "james@pesamaisha.co.ke"
      }
    }
  ]
}
```

---

# 4. Admin Analytics

### 4.1 Overview

High-level KPIs with period-over-period deltas. Compares the last 30 days vs the previous 30.

```
GET /admin/analytics/overview
Authorization: Bearer <admin-token>
```

**Sample response (200):**

```json
{
  "success": true,
  "data": {
    "customers": {
      "total": 1284,
      "newLast30": 62,
      "growthPct": 14.8
    },
    "loans": {
      "active": 341,
      "totalDisbursed": 8475000,
      "disbursedLast30": 612000,
      "disbursementGrowthPct": -3.2
    },
    "collections": {
      "collectedLast30": 498300,
      "collectionGrowthPct": 8.9
    },
    "risk": {
      "portfolioAtRisk": 89400,
      "parRatio": 3.4,
      "totalOutstanding": 2629412
    }
  }
}
```

---

### 4.2 Time Series

Daily buckets for a chosen metric.

```
GET /admin/analytics/timeseries?metric=disbursements&days=30
Authorization: Bearer <admin-token>
```

**Query parameters:**

| Name | Type | Required | Values |
|---|---|---|---|
| `metric` | string | yes | `disbursements` \| `collections` \| `applications` \| `new-customers` |
| `days` | number | no (default 30) | 1–365 |

**Sample response (200):**

```json
{
  "success": true,
  "data": [
    { "day": "2026-09-17T00:00:00.000Z", "count": 4, "amount": 42800 },
    { "day": "2026-09-18T00:00:00.000Z", "count": 7, "amount": 71000 },
    { "day": "2026-09-19T00:00:00.000Z", "count": 5, "amount": 55200 }
  ]
}
```

For `applications` and `new-customers`, the objects have `{ day, count }` — no `amount`.

---

### 4.3 Product Performance

Breakdown by loan product.

```
GET /admin/analytics/products
Authorization: Bearer <admin-token>
```

**Sample response (200):**

```json
{
  "success": true,
  "data": [
    {
      "productId": "a1b2c3d4-...",
      "name": "Personal Loan",
      "code": "PL-001",
      "metrics": {
        "totalLoans": 180,
        "activeLoans": 62,
        "overdueLoans": 8,
        "fullyPaidLoans": 110,
        "totalDisbursed": 3240000,
        "totalOutstanding": 892400,
        "overdueOutstanding": 41200,
        "defaultRate": 4.44,
        "applicationCount": 312,
        "approvalRate": 62.5
      }
    }
  ]
}
```

---

### 4.4 Cohort Analysis

Monthly cohorts of disbursed loans with repayment and default stats.

```
GET /admin/analytics/cohorts
Authorization: Bearer <admin-token>
```

**Sample response (200):**

```json
{
  "success": true,
  "data": [
    {
      "cohortMonth": "2026-10-01T00:00:00.000Z",
      "loans": 42,
      "disbursed": 512000,
      "outstanding": 384000,
      "paid": 128000,
      "repaymentRate": 25.0,
      "overdueLoans": 1,
      "defaultRate": 2.38
    },
    {
      "cohortMonth": "2026-09-01T00:00:00.000Z",
      "loans": 88,
      "disbursed": 1042000,
      "outstanding": 312000,
      "paid": 730000,
      "repaymentRate": 70.06,
      "overdueLoans": 6,
      "defaultRate": 6.82
    }
  ]
}
```

---

### 4.5 Activity Feed

Merged feed of the 20 latest loans, payments, applications, and KYC submissions.

```
GET /admin/analytics/activity
Authorization: Bearer <admin-token>
```

**Sample response (200):**

```json
{
  "success": true,
  "data": [
    {
      "type": "payment",
      "id": "p1a2b3c4-...",
      "title": "Payment for LN-20261010-4HDXRR via MPESA",
      "status": "COMPLETED",
      "amount": 1000,
      "at": "2026-10-16T13:07:55.000Z"
    },
    {
      "type": "loan",
      "id": "l5e6f7a8-...",
      "title": "Loan LN-20261016-AB12CD — Mary Wanjiku",
      "status": "ACTIVE",
      "amount": 5000,
      "at": "2026-10-16T12:30:00.000Z"
    },
    {
      "type": "application",
      "id": "app9a8b7c-...",
      "title": "Application APP-1792155889546-6933 — James Muniu",
      "status": "SUBMITTED",
      "amount": 1000,
      "at": "2026-10-16T11:15:00.000Z"
    },
    {
      "type": "kyc",
      "id": "k3b4c5d6-...",
      "title": "KYC — Peter Kamau",
      "status": "PENDING",
      "amount": null,
      "at": "2026-10-16T10:00:00.000Z"
    }
  ]
}
```

---

# 5. Payment Reconciliation

Look up stuck M-Pesa requests, query Safaricom, or manually resolve with a receipt.

### 5.1 Reconciliation Summary

```
GET /admin/reconciliation/summary
Authorization: Bearer <admin-token>
```

**Sample response (200):**

```json
{
  "success": true,
  "data": {
    "pendingTotal": 4,
    "pendingOver1Hour": 2,
    "pendingOver1Day": 0,
    "recentlyResolved": 12
  }
}
```

---

### 5.2 Search STK Requests

Searches by checkoutRequestId, merchantRequestId, phone, or receipt.

```
GET /admin/reconciliation/stk?query=254708374149&status=PENDING&limit=50
Authorization: Bearer <admin-token>
```

**Query parameters:**

| Name | Type | Required |
|---|---|---|
| `query` | string | no |
| `status` | enum | no — `PENDING` \| `SUCCESS` \| `FAILED` \| `TIMEOUT` \| `CANCELLED` |
| `fromDate` | ISO date | no |
| `toDate` | ISO date | no |
| `limit` | number | no (default 50, max 200) |

**Sample response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "cc532510-782d-4a7f-b1dc-1b5004cb9c9f",
      "merchantRequestId": "MR-ef0d35a7-...",
      "checkoutRequestId": "ws_CO_141020261054417700747076",
      "phone": "254700747076",
      "amount": "1.00",
      "status": "PENDING",
      "createdAt": "2026-10-14T07:54:41.049Z",
      "payment": {
        "id": "7c372e33-...",
        "paymentReference": "PAY-20261014-8J5ZPU",
        "status": "PENDING",
        "amount": "1",
        "transactionReference": null,
        "failureReason": null,
        "processedAt": null
      },
      "loan": {
        "id": "a107deac-...",
        "loanNumber": "LN-20261010-4HDXRR",
        "user": {
          "id": "aeb5a810-...",
          "firstName": "James",
          "lastName": "Muniu",
          "email": "james500muniu@gmail.com"
        }
      }
    }
  ]
}
```

---

### 5.3 Get STK Request Detail

```
GET /admin/reconciliation/stk/:id
Authorization: Bearer <admin-token>
```

Returns the full row including request and callback bodies.

---

### 5.4 Query Safaricom Live

For a stuck request. Safaricom responds with the current state of the transaction, and the local record is updated based on the response.

```
POST /admin/reconciliation/stk/:id/query-safaricom
Authorization: Bearer <admin-token>
```

**Sample response (200 — payment succeeded):**

```json
{
  "success": true,
  "data": {
    "safaricom": {
      "ResponseCode": "0",
      "ResponseDescription": "The service request has been accepted successfully",
      "MerchantRequestID": "4e7d-425c-aa3e-9b62f1dcf8a21583164",
      "CheckoutRequestID": "ws_CO_141020261054417700747076",
      "ResultCode": "0",
      "ResultDesc": "The service request is processed successfully."
    },
    "message": "Safaricom confirmed the payment. Loan has been credited.",
    "reconciled": true
  }
}
```

**Sample response (200 — still processing):**

```json
{
  "success": true,
  "data": {
    "safaricom": {
      "ResponseCode": "0",
      "ResponseDescription": "Accepted",
      "ResultCode": "500.001.1001",
      "ResultDesc": "The transaction is being processed"
    },
    "message": "Safaricom is still processing this request. Try again in a minute.",
    "reconciled": false
  }
}
```

---

### 5.5 Manually Resolve

Admin has verified the payment externally (customer statement, Safaricom support, SMS). Marks the payment `COMPLETED` and credits the loan.

```
POST /admin/reconciliation/stk/:id/manual-resolve
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Sample request body:**

```json
{
  "receipt": "NLJ7RT61SV",
  "amount": 1000,
  "reason": "Customer forwarded M-Pesa confirmation SMS. Receipt verified against Safaricom statement."
}
```

**Sample response (200):**

```json
{
  "success": true,
  "data": { "success": true }
}
```

**Errors:**

| Status | Body |
|---|---|
| 400 | `{ "success": false, "message": "This payment is already marked completed." }` |
| 404 | `{ "success": false, "message": "Not found" }` |

---

### 5.6 Mark as Failed

Admin has determined the payment never succeeded (e.g., customer says they cancelled). Marks the row `FAILED` without crediting the loan.

```
POST /admin/reconciliation/stk/:id/mark-failed
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Sample request body:**

```json
{
  "reason": "Customer confirmed cancelling the prompt. Safaricom has no record of a completed transaction."
}
```

**Sample response (200):**

```json
{
  "success": true,
  "data": { "success": true }
}
```

**Errors:**

| Status | Body |
|---|---|
| 400 | `{ "success": false, "message": "Only PENDING requests can be marked failed." }` |

---

# 6. Customer Reports

### 6.1 Account Statement

Every transaction across every loan the customer has.

```
GET /me/reports/statement?format=json&startDate=2026-09-01&endDate=2026-10-31
Authorization: Bearer <customer-token>
```

**Query parameters:**

| Name | Type | Default |
|---|---|---|
| `format` | `json` \| `csv` \| `pdf` | `json` |
| `startDate` | ISO date | none |
| `endDate` | ISO date | none |
| `loanId` | UUID | none (all loans) |

**Sample response (200 — `format=json`):**

```json
{
  "success": true,
  "data": {
    "customer": {
      "id": "aeb5a810-...",
      "firstName": "James",
      "lastName": "Muniu",
      "email": "james500muniu@gmail.com",
      "phone": "254700747076",
      "nationalId": "12345678"
    },
    "transactions": [
      {
        "id": "tx1a2b3c4-...",
        "loanNumber": "LN-20261010-4HDXRR",
        "type": "DISBURSEMENT",
        "amount": 1000,
        "description": "Loan disbursed successfully",
        "reference": null,
        "transactionNumber": "TXN-20261010-AB12CD",
        "balanceBefore": 0,
        "balanceAfter": 1052,
        "createdAt": "2026-10-10T10:00:00.000Z",
        "payment": null
      },
      {
        "id": "tx5e6f7a8-...",
        "loanNumber": "LN-20261010-4HDXRR",
        "type": "REPAYMENT",
        "amount": 5,
        "description": "Repayment via MPESA",
        "reference": "NLJ7RT61SV",
        "transactionNumber": "TXN-20261014-XX12YY",
        "balanceBefore": 1052,
        "balanceAfter": 1047,
        "createdAt": "2026-10-14T08:30:00.000Z",
        "payment": {
          "reference": "PAY-20261014-8J5ZPU",
          "method": "MPESA",
          "receipt": "NLJ7RT61SV"
        }
      }
    ],
    "summary": {
      "totalDisbursed": 1000,
      "totalRepaid": 5,
      "totalFees": 52,
      "totalPenalties": 0,
      "currentOutstanding": 1047
    }
  }
}
```

When `format=csv`, the response body is a CSV file. When `format=pdf`, a PDF is returned with the summary in the header band and one row per transaction.

---

### 6.2 Loan Summary

All loans for the customer with progress and next due info.

```
GET /me/reports/loans
Authorization: Bearer <customer-token>
```

**Sample response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "a107deac-...",
      "loanNumber": "LN-20261010-4HDXRR",
      "product": "Personal Loan",
      "status": "PARTIALLY_PAID",
      "principal": 1000,
      "interest": 50,
      "fees": 52,
      "penalty": 0,
      "total": 1052,
      "paid": 5,
      "outstanding": 1047,
      "repaymentDays": 7,
      "disbursedAt": "2026-10-10T19:51:35.552Z",
      "maturityDate": "2026-10-17T19:51:35.552Z",
      "paidPct": 0.47,
      "scheduleProgress": {
        "paidInstallments": 0,
        "totalInstallments": 1
      },
      "nextDue": {
        "installmentNumber": 1,
        "dueDate": "2026-10-17T19:51:35.552Z",
        "amount": 1052,
        "outstanding": 1047,
        "isOverdue": false,
        "daysUntilDue": 2
      }
    }
  ]
}
```

---

### 6.3 Payment History

Every payment the customer has made, filterable by date and loan.

```
GET /me/reports/payments?format=json&startDate=2026-09-01
Authorization: Bearer <customer-token>
```

**Sample response (200):**

```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "7c372e33-...",
        "reference": "PAY-20261014-8J5ZPU",
        "loanNumber": "LN-20261010-4HDXRR",
        "amount": 1,
        "method": "MPESA",
        "status": "COMPLETED",
        "receipt": "NLJ7RT61SV",
        "failureReason": null,
        "processedAt": "2026-10-14T07:55:03.000Z",
        "createdAt": "2026-10-14T07:54:41.049Z"
      }
    ],
    "summary": {
      "totalPayments": 1,
      "totalCompleted": 1,
      "totalPaid": 1
    }
  }
}
```

---

# 7. Report Exports (Admin)

Every admin report has a matching export endpoint that returns either CSV or PDF.

### 7.1 Loan Portfolio Export

```
GET /reports/loans/export?format=csv
GET /reports/loans/export?format=pdf&startDate=2026-01-01&endDate=2026-12-31
Authorization: Bearer <admin-token>
```

**Response headers:**

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="loan-portfolio-1760000000000.csv"
```

or

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="loan-portfolio-1760000000000.pdf"
```

**CSV columns:**

```
LoanNumber,Customer,Email,Phone,Product,Principal,Outstanding,Paid,Status,DisbursedAt,MaturityDate
LN-20261010-4HDXRR,James Muniu,james@example.com,254700747076,Personal Loan,1000,1047,5,PARTIALLY_PAID,2026-10-10,2026-10-17
```

---

### 7.2 Payments Export

```
GET /reports/payments/export?format=pdf&startDate=2026-10-01
Authorization: Bearer <admin-token>
```

**CSV columns:**

```
Reference,Loan,Amount,Method,Status,Receipt,ProcessedAt,CreatedAt
PAY-20261014-8J5ZPU,LN-20261010-4HDXRR,1,MPESA,COMPLETED,NLJ7RT61SV,2026-10-14T07:55:03.000Z,2026-10-14T07:54:41.049Z
```

---

### 7.3 Overdue Loans Export

```
GET /reports/overdue/export?format=csv
Authorization: Bearer <admin-token>
```

**CSV columns:**

```
LoanNumber,Customer,Phone,Product,Outstanding,MaturityDate,DaysOverdue
LN-20261001-XY34AB,Peter Kamau,254711223344,Personal Loan,2500,2026-10-08,8
```

---

### 7.4 Applications Export

```
GET /reports/applications/export?format=pdf&status=APPROVED
Authorization: Bearer <admin-token>
```

**CSV columns:**

```
ApplicationNumber,Customer,Email,Product,RequestedAmount,RequestedDays,Status,SubmittedAt
APP-1792155889546-6933,James Muniu,james@example.com,Personal Loan,1000,7,SUBMITTED,2026-10-16
```

---

# 8. Eligibility Check

Frontend uses this to gate the `/applyloan` wizard.

### 8.1 Check Eligibility

```
GET /loan-applications/eligibility
Authorization: Bearer <customer-token>
```

**Sample response (200 — can apply):**

```json
{
  "success": true,
  "data": { "canApply": true }
}
```

**Sample response (200 — active loan):**

```json
{
  "success": true,
  "data": {
    "canApply": false,
    "reason": "ACTIVE_LOAN",
    "loanNumber": "LN-20261010-4HDXRR",
    "status": "ACTIVE"
  }
}
```

**Sample response (200 — open application):**

```json
{
  "success": true,
  "data": {
    "canApply": false,
    "reason": "OPEN_APPLICATION",
    "applicationNumber": "APP-1792155889546-6933",
    "status": "UNDER_REVIEW"
  }
}
```

---

# Common error shapes

The backend returns errors in two consistent shapes:

**Simple error:**

```json
{
  "success": false,
  "message": "Human-readable description"
}
```

**Zod validation error (V4):**

```json
{
  "success": false,
  "message": "Invalid request",
  "issues": [
    {
      "code": "too_small",
      "path": ["phone"],
      "message": "Too small: expected string to have >=9 characters"
    }
  ]
}
```

---

# Environment & variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend base URL used by the frontend |
| `MPESA_ENV` | `sandbox` or `production` |
| `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET` | Daraja OAuth |
| `MPESA_SHORTCODE`, `MPESA_PASSKEY` | Paybill / Till + passkey |
| `MPESA_CALLBACK_URL` | Public HTTPS URL for Safaricom callbacks |
| `CRON_SECRET` | Shared secret for external cron triggers |

---

# Authentication summary

| Role | Can access |
|---|---|
| Customer | `/terms/published`, `/signatures/*`, `/me/reports/*`, `/loan-applications/eligibility` |
| Admin / Super Admin | Everything under `/terms`, `/ops`, `/admin/analytics`, `/admin/reconciliation`, `/reports/*/export` |
| Finance Officer | Same as Admin except user role changes |
| Loan Officer / Support | Read-only on most admin endpoints; no terms or reconciliation writes |
| Public | `/signatures/verify`, `/terms/published` |

---

# Postman collection

If you want to import all of this into Postman, save the following as `pesamaisha.postman_collection.json` and import it:

```json
{
  "info": {
    "name": "PesaMaisha API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    { "key": "baseUrl", "value": "http://localhost:5000/api/v1" },
    { "key": "customerToken", "value": "" },
    { "key": "adminToken", "value": "" },
    { "key": "applicationId", "value": "" }
  ],
  "item": [
    {
      "name": "Terms",
      "item": [
        {
          "name": "Get published terms",
          "request": {
            "method": "GET",
            "url": "{{baseUrl}}/terms/published"
          }
        },
        {
          "name": "Create terms version",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Authorization", "value": "Bearer {{adminToken}}" },
              { "key": "Content-Type", "value": "application/json" }
            ],
            "url": "{{baseUrl}}/terms",
            "body": {
              "mode": "raw",
              "raw": "{\"label\":\"Q4 2026\",\"body\":\"...\",\"publish\":true}"
            }
          }
        }
      ]
    },
    {
      "name": "Signatures",
      "item": [
        {
          "name": "Sign application",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Authorization", "value": "Bearer {{customerToken}}" },
              { "key": "Content-Type", "value": "application/json" }
            ],
            "url": "{{baseUrl}}/signatures/{{applicationId}}/sign",
            "body": {
              "mode": "raw",
              "raw": "{\"method\":\"TYPED_NAME\",\"signatureData\":\"James Muniu\",\"agreedToTerms\":true,\"agreedToPrivacy\":true,\"agreedToDebit\":true,\"termsVersion\":1,\"termsHash\":\"0000...\"}"
            }
          }
        },
        {
          "name": "Download application PDF",
          "request": {
            "method": "GET",
            "header": [
              { "key": "Authorization", "value": "Bearer {{customerToken}}" }
            ],
            "url": "{{baseUrl}}/signatures/{{applicationId}}/pdf"
          }
        },
        {
          "name": "Verify signature",
          "request": {
            "method": "GET",
            "url": "{{baseUrl}}/signatures/verify?hash="
          }
        }
      ]
    },
    {
      "name": "Ops Console",
      "item": [
        {
          "name": "List jobs",
          "request": {
            "method": "GET",
            "header": [
              { "key": "Authorization", "value": "Bearer {{adminToken}}" }
            ],
            "url": "{{baseUrl}}/ops/jobs"
          }
        },
        {
          "name": "Run job",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Authorization", "value": "Bearer {{adminToken}}" }
            ],
            "url": "{{baseUrl}}/ops/jobs/send-repayment-reminders/run"
          }
        }
      ]
    }
  ]
}
```

Add the rest of the endpoints as you build them out; the pattern is identical — a bearer token header and a JSON body or query string.

---

# What to keep current

When you add a new endpoint, add it here with:

1. **Method + path** (including any `:param` placeholders).
2. **Auth requirement** (public / customer / admin / specific role).
3. **Sample request body** (with realistic values).
4. **Sample response** (with a real HTTP status).
5. **Error table** (each distinct failure and its message).

Keeping this file as the source of truth for new endpoints means anyone — a mobile developer, an integrator, a future teammate — can consume the API without reading the backend code.