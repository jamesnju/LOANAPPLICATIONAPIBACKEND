Below is the API documentation for the **Loan Application Maker–Checker / Approval module**, aligned with your current Prisma schema and the implementation we just created. The flow follows the standard four-eyes principle: the person who reviews an application cannot be the person who gives the final approval. ([Finecko][1])

# Loan Application Approval / Maker-Checker API

**Base URL**

```text
/api/v1/loan-applications
```

All endpoints require an authenticated user.

---

## 1. Review Loan Application

Moves an application from:

```text
SUBMITTED → UNDER_REVIEW
```

The reviewer becomes the **maker** for the approval process.

### Endpoint

```http
PATCH /api/v1/loan-applications/:id/review
```

### Authorized roles

```text
LOAN_OFFICER
ADMIN
SUPER_ADMIN
```

### Request

```http
PATCH /api/v1/loan-applications/550e8400-e29b-41d4-a716-446655440000/review
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "comments": "Application documents and customer information reviewed."
}
```

`comments` is optional.

### Successful response

```json
{
  "success": true,
  "message": "Loan application moved to review",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "applicationNumber": "APP-20260928-0001",
    "userId": "7b2e1d50-3c2d-4d92-8f5b-123456789abc",
    "loanProductId": "8c3f1e60-4d3e-4e93-9a6c-987654321def",
    "requestedAmount": "3000.00",
    "requestedDays": 30,
    "interestRate": "5.0000",
    "processingFee": "100.00",
    "purpose": "Business stock",
    "status": "UNDER_REVIEW",
    "reviewedAt": "2026-09-28T13:10:00.000Z",
    "createdAt": "2026-09-28T12:30:00.000Z"
  }
}
```

### Approval history created

Behind the scenes, the system creates:

```json
{
  "applicationId": "550e8400-e29b-41d4-a716-446655440000",
  "approverId": "11111111-2222-3333-4444-555555555555",
  "action": "REVIEW",
  "comments": "Application documents and customer information reviewed."
}
```

---

# 2. Request Additional Documents

If the Loan Officer finds missing or insufficient information, they can request additional documents.

Moves:

```text
UNDER_REVIEW → DOCUMENTS_REQUIRED
```

### Endpoint

```http
PATCH /api/v1/loan-applications/:id/request-documents
```

### Authorized roles

```text
LOAN_OFFICER
ADMIN
SUPER_ADMIN
```

### Request

```http
PATCH /api/v1/loan-applications/550e8400-e29b-41d4-a716-446655440000/request-documents
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "comments": "Please upload a clear copy of your national ID and latest payslip."
}
```

### Response

```json
{
  "success": true,
  "message": "Additional documents requested",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "applicationNumber": "APP-20260928-0001",
    "status": "DOCUMENTS_REQUIRED",
    "updatedAt": "2026-09-28T13:20:00.000Z"
  }
}
```

Approval history:

```json
{
  "action": "REQUEST_DOCUMENTS",
  "approverId": "11111111-2222-3333-4444-555555555555",
  "comments": "Please upload a clear copy of your national ID and latest payslip."
}
```

After the customer provides the documents, the application can return to:

```text
UNDER_REVIEW
```

---

# 3. Submit Application for Final Approval

Once the maker has completed the review, the application moves to the checker queue.

Moves:

```text
UNDER_REVIEW → PENDING_APPROVAL
```

### Endpoint

```http
PATCH /api/v1/loan-applications/:id/submit-for-approval
```

### Authorized roles

```text
LOAN_OFFICER
ADMIN
SUPER_ADMIN
```

### Request

```http
PATCH /api/v1/loan-applications/550e8400-e29b-41d4-a716-446655440000/submit-for-approval
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "comments": "Application reviewed and ready for final approval."
}
```

### Response

```json
{
  "success": true,
  "message": "Loan application submitted for approval",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "applicationNumber": "APP-20260928-0001",
    "requestedAmount": "3000.00",
    "requestedDays": 30,
    "status": "PENDING_APPROVAL",
    "reviewedAt": "2026-09-28T13:10:00.000Z",
    "updatedAt": "2026-09-28T13:30:00.000Z"
  }
}
```

Approval history now contains:

```text
REVIEW
SUBMIT
```

The application is now waiting for a checker.

---

# 4. Approve Loan Application

The checker gives the final approval.

Moves:

```text
PENDING_APPROVAL → APPROVED
```

### Endpoint

```http
PATCH /api/v1/loan-applications/:id/approve
```

### Authorized roles

```text
ADMIN
SUPER_ADMIN
```

### Request

```http
PATCH /api/v1/loan-applications/550e8400-e29b-41d4-a716-446655440000/approve
Authorization: Bearer <checker_access_token>
Content-Type: application/json
```

```json
{
  "comments": "Application reviewed and approved for disbursement."
}
```

### Successful response

```json
{
  "success": true,
  "message": "Loan application approved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "applicationNumber": "APP-20260928-0001",
    "requestedAmount": "3000.00",
    "requestedDays": 30,
    "interestRate": "5.0000",
    "processingFee": "100.00",
    "status": "APPROVED",
    "approvedAt": "2026-09-28T13:45:00.000Z",
    "updatedAt": "2026-09-28T13:45:00.000Z"
  }
}
```

### Important

**Approval does not disburse the loan.**

At this point:

```text
LoanApplication.status = APPROVED
```

but there is not yet an active `Loan`.

The next module will convert the approved application into a `Loan` with:

```text
Loan.status = PENDING_DISBURSEMENT
```

This separation is useful because approval and disbursement are separate financial actions.

---

# 5. Reject Loan Application

A checker can reject an application after it reaches `PENDING_APPROVAL`.

Moves:

```text
PENDING_APPROVAL → REJECTED
```

### Endpoint

```http
PATCH /api/v1/loan-applications/:id/reject
```

### Authorized roles

```text
ADMIN
SUPER_ADMIN
```

### Request

```http
PATCH /api/v1/loan-applications/550e8400-e29b-41d4-a716-446655440000/reject
Authorization: Bearer <checker_access_token>
Content-Type: application/json
```

```json
{
  "comments": "Application does not meet the required lending criteria."
}
```

### Response

```json
{
  "success": true,
  "message": "Loan application rejected",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "applicationNumber": "APP-20260928-0001",
    "status": "REJECTED",
    "rejectionReason": "Application does not meet the required lending criteria.",
    "rejectedAt": "2026-09-28T13:45:00.000Z",
    "updatedAt": "2026-09-28T13:45:00.000Z"
  }
}
```

---

# 6. Get Approval History

Returns every action taken against the application.

### Endpoint

```http
GET /api/v1/loan-applications/:id/approvals
```

### Request

```http
GET /api/v1/loan-applications/550e8400-e29b-41d4-a716-446655440000/approvals
Authorization: Bearer <access_token>
```

### Response

```json
{
  "success": true,
  "message": "Approval history retrieved successfully",
  "data": [
    {
      "id": "approval-111",
      "applicationId": "550e8400-e29b-41d4-a716-446655440000",
      "approverId": "11111111-2222-3333-4444-555555555555",
      "action": "REVIEW",
      "comments": "Application documents reviewed.",
      "createdAt": "2026-09-28T13:10:00.000Z",
      "approver": {
        "id": "11111111-2222-3333-4444-555555555555",
        "firstName": "John",
        "lastName": "Kamau",
        "email": "john@example.com",
        "role": "LOAN_OFFICER"
      }
    },
    {
      "id": "approval-222",
      "applicationId": "550e8400-e29b-41d4-a716-446655440000",
      "approverId": "11111111-2222-3333-4444-666666666666",
      "action": "SUBMIT",
      "comments": "Application reviewed and ready for final approval.",
      "createdAt": "2026-09-28T13:30:00.000Z",
      "approver": {
        "id": "11111111-2222-3333-4444-555555555555",
        "firstName": "John",
        "lastName": "Kamau",
        "email": "john@example.com",
        "role": "LOAN_OFFICER"
      }
    },
    {
      "id": "approval-333",
      "applicationId": "550e8400-e29b-41d4-a716-446655440000",
      "approverId": "11111111-2222-3333-4444-777777777777",
      "action": "APPROVE",
      "comments": "Application reviewed and approved for disbursement.",
      "createdAt": "2026-09-28T13:45:00.000Z",
      "approver": {
        "id": "11111111-2222-3333-4444-777777777777",
        "firstName": "Mary",
        "lastName": "Wanjiku",
        "email": "mary@example.com",
        "role": "ADMIN"
      }
    }
  ]
}
```

---

# 7. Complete API summary

| Method  | Endpoint                                     | Purpose                              | Roles                            |
| ------- | -------------------------------------------- | ------------------------------------ | -------------------------------- |
| `PATCH` | `/loan-applications/:id/review`              | Start application review             | LOAN_OFFICER, ADMIN, SUPER_ADMIN |
| `PATCH` | `/loan-applications/:id/request-documents`   | Request missing documents            | LOAN_OFFICER, ADMIN, SUPER_ADMIN |
| `PATCH` | `/loan-applications/:id/submit-for-approval` | Send reviewed application to checker | LOAN_OFFICER, ADMIN, SUPER_ADMIN |
| `PATCH` | `/loan-applications/:id/approve`             | Final approval                       | ADMIN, SUPER_ADMIN               |
| `PATCH` | `/loan-applications/:id/reject`              | Reject application                   | ADMIN, SUPER_ADMIN               |
| `GET`   | `/loan-applications/:id/approvals`           | View approval history                | Staff                            |

---

# 8. Complete status flow

```text
                    CUSTOMER
                       │
                       ▼
                  ┌─────────┐
                  │SUBMITTED│
                  └────┬────┘
                       │
                       │ Review
                       ▼
                ┌─────────────┐
                │UNDER_REVIEW │
                └──────┬──────┘
                       │
             ┌─────────┴──────────┐
             │                    │
             ▼                    ▼
   DOCUMENTS_REQUIRED       PENDING_APPROVAL
             │                    │
             │                    │
      Documents added             │
             │                    │
             └──► UNDER_REVIEW    │
                                  │
                         ┌────────┴────────┐
                         │                 │
                         ▼                 ▼
                    APPROVED           REJECTED
                         │
                         │
                         ▼
                PENDING_DISBURSEMENT
```

The key maker-checker control is:

```text
MAKER
Loan Officer
    │
    │ REVIEW
    ▼
PENDING_APPROVAL
    │
    │
    ▼
CHECKER
Admin / Super Admin
    │
    ├── APPROVE
    │
    └── REJECT
```

The **maker and checker must be different users**. This is the core segregation-of-duties rule used in maker-checker systems. ([Finecko][1])

### Important implementation note

Our current `LoanApproval` table gives us the approval history, while `LoanApplication.status` gives us the current state. That means we don't need a separate `MakerCheckerRequest` table for this version.

The next API module after this is **Loan Creation**, where:

```text
APPROVED LoanApplication
        ↓
Create Loan
        ↓
PENDING_DISBURSEMENT
        ↓
Disbursement
        ↓
ACTIVE
```

[1]: https://finecko.com/docs/guides/maker-checker.html?utm_source=chatgpt.com "Apache Fineract Maker-Checker: 4-Eyes Approval Workflow | Finecko Documentation"
