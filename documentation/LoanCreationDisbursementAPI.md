# Loan Creation + Disbursement API

**Base URL**

```text
/api/v1/loans
```

All endpoints require authentication.

---

## 1. Create Loan from Approved Application

Creates a `Loan` from an approved `LoanApplication`.

### Endpoint

```http
POST /api/v1/loans/from-application/:applicationId
```

### Roles

```text
FINANCE_OFFICER
ADMIN
SUPER_ADMIN
```

### Request

```http
POST /api/v1/loans/from-application/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <access_token>
```

No request body is required.

### Response

```json
{
  "success": true,
  "message": "Loan created successfully",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440111",
    "loanNumber": "LN-20260928-8F4K2P",
    "applicationId": "550e8400-e29b-41d4-a716-446655440000",
    "principalAmount": "3000.00",
    "interestRate": "5.0000",
    "interestAmount": "150.00",
    "processingFee": "100.00",
    "totalAmount": "3250.00",
    "amountPaid": "0.00",
    "outstandingAmount": "3250.00",
    "repaymentDays": 30,
    "status": "PENDING_DISBURSEMENT"
  }
}
```

> The application must have status `APPROVED`. A loan cannot be created twice for the same application.

---

# 2. Get My Loans

Returns loans belonging to the authenticated customer.

### Endpoint

```http
GET /api/v1/loans/me
```

### Request

```http
GET /api/v1/loans/me
Authorization: Bearer <access_token>
```

### Response

```json
{
  "success": true,
  "message": "Loans retrieved successfully",
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440111",
      "loanNumber": "LN-20260928-8F4K2P",
      "principalAmount": "3000.00",
      "totalAmount": "3250.00",
      "amountPaid": "0.00",
      "outstandingAmount": "3250.00",
      "status": "PENDING_DISBURSEMENT"
    }
  ]
}
```

---

# 3. Get Loan Details

### Endpoint

```http
GET /api/v1/loans/:id
```

### Request

```http
GET /api/v1/loans/660e8400-e29b-41d4-a716-446655440111
Authorization: Bearer <access_token>
```

### Response

```json
{
  "success": true,
  "message": "Loan retrieved successfully",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440111",
    "loanNumber": "LN-20260928-8F4K2P",
    "principalAmount": "3000.00",
    "interestRate": "5.0000",
    "interestAmount": "150.00",
    "processingFee": "100.00",
    "totalAmount": "3250.00",
    "amountPaid": "0.00",
    "outstandingAmount": "3250.00",
    "repaymentDays": 30,
    "disbursedAt": null,
    "maturityDate": null,
    "status": "PENDING_DISBURSEMENT"
  }
}
```

---

# 4. Disburse Loan

Disburses an approved loan and changes its status:

```text
PENDING_DISBURSEMENT → ACTIVE
```

### Endpoint

```http
POST /api/v1/loans/:id/disburse
```

### Roles

```text
FINANCE_OFFICER
ADMIN
SUPER_ADMIN
```

### Request

```http
POST /api/v1/loans/660e8400-e29b-41d4-a716-446655440111/disburse
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "paymentMethod": "MPESA",
  "transactionReference": "QGH7X9K2P1",
  "comments": "Loan disbursed to customer's registered M-Pesa number."
}
```

### Response

```json
{
  "success": true,
  "message": "Loan disbursed successfully",
  "data": {
    "loan": {
      "id": "660e8400-e29b-41d4-a716-446655440111",
      "loanNumber": "LN-20260928-8F4K2P",
      "principalAmount": "3000.00",
      "totalAmount": "3250.00",
      "amountPaid": "0.00",
      "outstandingAmount": "3250.00",
      "disbursedAt": "2026-09-28T13:00:00.000Z",
      "maturityDate": "2026-10-28T13:00:00.000Z",
      "status": "ACTIVE"
    },
    "transaction": {
      "transactionNumber": "TXN-20260928-AB12CD",
      "type": "DISBURSEMENT",
      "amount": "3000.00",
      "reference": "QGH7X9K2P1",
      "balanceBefore": "0.00",
      "balanceAfter": "3250.00"
    }
  }
}
```

---

# 5. Get Loan Transactions

Returns the financial transaction history for a loan.

### Endpoint

```http
GET /api/v1/loans/:id/transactions
```

### Request

```http
GET /api/v1/loans/660e8400-e29b-41d4-a716-446655440111/transactions
Authorization: Bearer <access_token>
```

### Response

```json
{
  "success": true,
  "message": "Loan transactions retrieved successfully",
  "data": [
    {
      "transactionNumber": "TXN-20260928-AB12CD",
      "type": "DISBURSEMENT",
      "amount": "3000.00",
      "reference": "QGH7X9K2P1",
      "balanceBefore": "0.00",
      "balanceAfter": "3250.00",
      "createdAt": "2026-09-28T13:00:00.000Z"
    }
  ]
}
```

---

## API Summary

| Method | Endpoint                                 | Purpose                               |
| ------ | ---------------------------------------- | ------------------------------------- |
| `POST` | `/loans/from-application/:applicationId` | Create loan from approved application |
| `GET`  | `/loans/me`                              | Customer's loans                      |
| `GET`  | `/loans/:id`                             | Get loan details                      |
| `POST` | `/loans/:id/disburse`                    | Disburse loan                         |
| `GET`  | `/loans/:id/transactions`                | Get financial transactions            |

### Flow

```text
APPROVED APPLICATION
        ↓
POST /loans/from-application/:applicationId
        ↓
PENDING_DISBURSEMENT
        ↓
POST /loans/:id/disburse
        ↓
ACTIVE
        ↓
NEXT MODULE: REPAYMENT SCHEDULE
```
