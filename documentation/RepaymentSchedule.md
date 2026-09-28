## Repayment Schedule API Documentation

The **Repayment Schedule module** manages the amounts a customer is expected to repay and tracks the repayment status of each loan.

For the current system design, each loan has **one final repayment installment** due on the loan's `maturityDate`.

### 1. Generate Repayment Schedule

Creates a repayment schedule for an **ACTIVE** loan.

**Endpoint**

```http
POST /api/v1/repayment-schedules/loan/:loanId/generate
```

**Authorization:** `FINANCE_OFFICER`, `ADMIN`, `SUPER_ADMIN`

**Request**

```http
POST /api/v1/repayment-schedules/loan/7b9c2e31-1234-4567-8901-abcdef123456/generate
Authorization: Bearer <access_token>
```

No request body is required.

**Sample Response**

```json
{
  "success": true,
  "message": "Repayment schedule generated successfully",
  "data": {
    "id": "a1b2c3d4-1234-4567-8901-abcdef123456",
    "loanId": "7b9c2e31-1234-4567-8901-abcdef123456",
    "installmentNumber": 1,
    "dueDate": "2026-10-28T10:30:00.000Z",
    "principalAmount": "3000.00",
    "interestAmount": "300.00",
    "penaltyAmount": "0.00",
    "totalAmount": "3400.00",
    "amountPaid": "0.00",
    "outstandingAmount": "3400.00",
    "status": "PENDING"
  }
}
```

---

### 2. Get My Repayment Schedules

Returns repayment schedules for all loans belonging to the logged-in customer.

**Endpoint**

```http
GET /api/v1/repayment-schedules/me
```

**Request**

```http
GET /api/v1/repayment-schedules/me
Authorization: Bearer <access_token>
```

**Sample Response**

```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-1234-4567-8901-abcdef123456",
      "loanId": "7b9c2e31-1234-4567-8901-abcdef123456",
      "installmentNumber": 1,
      "dueDate": "2026-10-28T10:30:00.000Z",
      "principalAmount": "3000.00",
      "interestAmount": "300.00",
      "penaltyAmount": "0.00",
      "totalAmount": "3400.00",
      "amountPaid": "0.00",
      "outstandingAmount": "3400.00",
      "status": "PENDING"
    }
  ]
}
```

---

### 3. Get Schedules for a Specific Loan

**Endpoint**

```http
GET /api/v1/repayment-schedules/loan/:loanId
```

**Request**

```http
GET /api/v1/repayment-schedules/loan/7b9c2e31-1234-4567-8901-abcdef123456
Authorization: Bearer <access_token>
```

**Sample Response**

```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-1234-4567-8901-abcdef123456",
      "loanId": "7b9c2e31-1234-4567-8901-abcdef123456",
      "installmentNumber": 1,
      "dueDate": "2026-10-28T10:30:00.000Z",
      "principalAmount": "3000.00",
      "interestAmount": "300.00",
      "penaltyAmount": "0.00",
      "totalAmount": "3400.00",
      "amountPaid": "0.00",
      "outstandingAmount": "3400.00",
      "status": "PENDING"
    }
  ]
}
```

---

### 4. Get a Single Repayment Schedule

**Endpoint**

```http
GET /api/v1/repayment-schedules/:id
```

**Sample Request**

```http
GET /api/v1/repayment-schedules/a1b2c3d4-1234-4567-8901-abcdef123456
Authorization: Bearer <access_token>
```

**Sample Response**

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-1234-4567-8901-abcdef123456",
    "loanId": "7b9c2e31-1234-4567-8901-abcdef123456",
    "installmentNumber": 1,
    "dueDate": "2026-10-28T10:30:00.000Z",
    "principalAmount": "3000.00",
    "interestAmount": "300.00",
    "penaltyAmount": "0.00",
    "totalAmount": "3400.00",
    "amountPaid": "0.00",
    "outstandingAmount": "3400.00",
    "status": "PENDING"
  }
}
```

### Repayment Statuses

| Status           | Meaning                                                       |
| ---------------- | ------------------------------------------------------------- |
| `PENDING`        | No payment has been made                                      |
| `PARTIALLY_PAID` | Customer has paid part of the amount                          |
| `PAID`           | The installment has been fully paid                           |
| `OVERDUE`        | Due date has passed and there is still an outstanding balance |
| `WAIVED`         | Repayment has been waived by an authorized user               |

### Current repayment calculation

Example:

```text
Principal       = KSh 3,000
Interest (10%)  = KSh 300
Processing Fee  = KSh 100
--------------------------------
Total Repayment = KSh 3,400
```

The next module, **Payments**, will update `amountPaid`, `outstandingAmount`, and `status` when the customer makes a repayment.
