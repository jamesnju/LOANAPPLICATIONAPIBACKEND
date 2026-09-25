Absolutely. Below are **Postman-ready API samples** for the System Configuration and Loan Product modules we have built.

Assuming your backend runs on:

```text
http://localhost:8000
```

and your API prefix is:

```text
/api/v1
```

---

# 1. Health Check

### Request

```http
GET http://localhost:8000/api/v1/health
```

### Response

```json
{
  "success": true,
  "message": "Loan Platform API is running"
}
```

---

# 2. System Configuration APIs

## 2.1 Create System Configuration

### Request

```http
POST http://localhost:8000/api/v1/system-config
```

### Headers

```text
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

### Body

```json
{
  "key": "LOAN_MIN_AMOUNT",
  "name": "Minimum Loan Amount",
  "description": "Minimum amount a customer can apply for",
  "type": "DECIMAL",
  "value": "1000.00",
  "defaultValue": "1000.00",
  "category": "LOAN",
  "isEditable": true,
  "isActive": true
}
```

### Response — 201

```json
{
  "success": true,
  "message": "System configuration created successfully",
  "data": {
    "id": "0c5f3e3e-3c2d-4b6c-8c2d-8f2b1a5d7e21",
    "key": "LOAN_MIN_AMOUNT",
    "name": "Minimum Loan Amount",
    "description": "Minimum amount a customer can apply for",
    "type": "DECIMAL",
    "value": "1000.00",
    "defaultValue": "1000.00",
    "category": "LOAN",
    "isEditable": true,
    "isActive": true,
    "createdAt": "2026-09-25T12:30:00.000Z",
    "updatedAt": "2026-09-25T12:30:00.000Z"
  }
}
```

---

# 3. Get All System Configurations

### Request

```http
GET http://localhost:8000/api/v1/system-config
```

### Headers

```text
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Response — 200

```json
{
  "success": true,
  "data": [
    {
      "id": "0c5f3e3e-3c2d-4b6c-8c2d-8f2b1a5d7e21",
      "key": "LOAN_MIN_AMOUNT",
      "name": "Minimum Loan Amount",
      "description": "Minimum amount a customer can apply for",
      "type": "DECIMAL",
      "value": "1000.00",
      "defaultValue": "1000.00",
      "category": "LOAN",
      "isEditable": true,
      "isActive": true,
      "createdAt": "2026-09-25T12:30:00.000Z",
      "updatedAt": "2026-09-25T12:30:00.000Z"
    },
    {
      "id": "9e8c7a6b-5d4f-3210-9876-543210abcdef",
      "key": "LOAN_MAX_AMOUNT",
      "name": "Maximum Loan Amount",
      "description": "Maximum amount a customer can apply for",
      "type": "DECIMAL",
      "value": "100000.00",
      "defaultValue": "100000.00",
      "category": "LOAN",
      "isEditable": true,
      "isActive": true,
      "createdAt": "2026-09-25T12:31:00.000Z",
      "updatedAt": "2026-09-25T12:31:00.000Z"
    }
  ]
}
```

---

# 4. Get One System Configuration

### Request

Replace the ID with the actual ID from your database.

```http
GET http://localhost:8000/api/v1/system-config/0c5f3e3e-3c2d-4b6c-8c2d-8f2b1a5d7e21
```

### Headers

```text
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Response — 200

```json
{
  "success": true,
  "data": {
    "id": "0c5f3e3e-3c2d-4b6c-8c2d-8f2b1a5d7e21",
    "key": "LOAN_MIN_AMOUNT",
    "name": "Minimum Loan Amount",
    "description": "Minimum amount a customer can apply for",
    "type": "DECIMAL",
    "value": "1000.00",
    "defaultValue": "1000.00",
    "category": "LOAN",
    "isEditable": true,
    "isActive": true,
    "createdAt": "2026-09-25T12:30:00.000Z",
    "updatedAt": "2026-09-25T12:30:00.000Z"
  }
}
```

---

# 5. Update System Configuration

### Request

```http
PUT http://localhost:8000/api/v1/system-config/0c5f3e3e-3c2d-4b6c-8c2d-8f2b1a5d7e21
```

### Headers

```text
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

### Body

```json
{
  "value": "2000.00"
}
```

Notice that you don't need to send every field. Our update schema is partial.

### Response — 200

```json
{
  "success": true,
  "message": "System configuration updated successfully",
  "data": {
    "id": "0c5f3e3e-3c2d-4b6c-8c2d-8f2b1a5d7e21",
    "key": "LOAN_MIN_AMOUNT",
    "name": "Minimum Loan Amount",
    "description": "Minimum amount a customer can apply for",
    "type": "DECIMAL",
    "value": "2000.00",
    "defaultValue": "1000.00",
    "category": "LOAN",
    "isEditable": true,
    "isActive": true,
    "createdAt": "2026-09-25T12:30:00.000Z",
    "updatedAt": "2026-09-25T12:45:00.000Z"
  }
}
```

---

# 6. Delete System Configuration

Only `SUPER_ADMIN` can perform this operation.

### Request

```http
DELETE http://localhost:8000/api/v1/system-config/0c5f3e3e-3c2d-4b6c-8c2d-8f2b1a5d7e21
```

### Headers

```text
Authorization: Bearer SUPER_ADMIN_ACCESS_TOKEN
```

### Response

```json
{
  "success": true,
  "message": "System configuration deleted successfully"
}
```

---

# 7. Recommended System Configurations

For your loan system, I would create these initial configurations:

| Key                         | Type    | Example Value | Category |
| --------------------------- | ------- | ------------: | -------- |
| `LOAN_MIN_AMOUNT`           | DECIMAL |     `1000.00` | LOAN     |
| `LOAN_MAX_AMOUNT`           | DECIMAL |   `100000.00` | LOAN     |
| `LOAN_MIN_REPAYMENT_DAYS`   | INTEGER |           `7` | LOAN     |
| `LOAN_MAX_REPAYMENT_DAYS`   | INTEGER |          `90` | LOAN     |
| `DEFAULT_INTEREST_RATE`     | DECIMAL |        `5.00` | LOAN     |
| `DEFAULT_PROCESSING_FEE`    | DECIMAL |        `2.00` | LOAN     |
| `DEFAULT_LATE_PENALTY_RATE` | DECIMAL |        `1.00` | LOAN     |
| `MAX_ACTIVE_LOANS`          | INTEGER |           `1` | LOAN     |
| `OTP_EXPIRATION_MINUTES`    | INTEGER |          `10` | AUTH     |
| `MAX_OTP_ATTEMPTS`          | INTEGER |           `5` | AUTH     |
| `MAX_LOGIN_ATTEMPTS`        | INTEGER |           `5` | AUTH     |
| `SESSION_TIMEOUT_MINUTES`   | INTEGER |          `30` | SECURITY |

For example:

### Create maximum loan amount

```http
POST http://localhost:8000/api/v1/system-config
```

```json
{
  "key": "LOAN_MAX_AMOUNT",
  "name": "Maximum Loan Amount",
  "description": "Maximum amount a customer can apply for",
  "type": "DECIMAL",
  "value": "100000.00",
  "defaultValue": "100000.00",
  "category": "LOAN",
  "isEditable": true,
  "isActive": true
}
```

### Create repayment days

```json
{
  "key": "LOAN_MAX_REPAYMENT_DAYS",
  "name": "Maximum Loan Repayment Days",
  "description": "Maximum number of days allowed for loan repayment",
  "type": "INTEGER",
  "value": "90",
  "defaultValue": "90",
  "category": "LOAN",
  "isEditable": true,
  "isActive": true
}
```

---

# 8. Loan Product APIs

Your other module has similar endpoints.

## Create Loan Product

```http
POST http://localhost:8000/api/v1/loan-products
```

### Headers

```text
Authorization: Bearer ADMIN_ACCESS_TOKEN
Content-Type: application/json
```

### Body

```json
{
  "name": "Standard Loan",
  "code": "STANDARD_LOAN",
  "description": "Standard short-term loan product",
  "minAmount": 1000,
  "maxAmount": 100000,
  "minRepaymentDays": 7,
  "maxRepaymentDays": 90,
  "interestRate": 5,
  "processingFee": 2,
  "latePenaltyRate": 1,
  "isActive": true
}
```

### Response — 201

```json
{
  "success": true,
  "message": "Loan product created successfully",
  "data": {
    "id": "7a1b2c3d-4e5f-6789-abcd-123456789000",
    "name": "Standard Loan",
    "code": "STANDARD_LOAN",
    "description": "Standard short-term loan product",
    "minAmount": "1000",
    "maxAmount": "100000",
    "minRepaymentDays": 7,
    "maxRepaymentDays": 90,
    "interestRate": "5",
    "processingFee": "2",
    "latePenaltyRate": "1",
    "isActive": true,
    "createdAt": "2026-09-25T13:00:00.000Z",
    "updatedAt": "2026-09-25T13:00:00.000Z"
  }
}
```

## Get Active Products

This endpoint was intentionally left public in the routes we created:

```http
GET http://localhost:8000/api/v1/loan-products/active
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "7a1b2c3d-4e5f-6789-abcd-123456789000",
      "name": "Standard Loan",
      "code": "STANDARD_LOAN",
      "description": "Standard short-term loan product",
      "minAmount": "1000",
      "maxAmount": "100000",
      "minRepaymentDays": 7,
      "maxRepaymentDays": 90,
      "interestRate": "5",
      "processingFee": "2",
      "latePenaltyRate": "1",
      "isActive": true
    }
  ]
}
```

## Get All Products

```http
GET http://localhost:8000/api/v1/loan-products
```

Requires:

```text
ADMIN
SUPER_ADMIN
LOAN_OFFICER
```

## Get One Product

```http
GET http://localhost:8000/api/v1/loan-products/PRODUCT_ID
```

## Update Product

```http
PUT http://localhost:8000/api/v1/loan-products/PRODUCT_ID
```

Example body:

```json
{
  "maxAmount": 150000,
  "interestRate": 4.5
}
```

## Delete Product

```http
DELETE http://localhost:8000/api/v1/loan-products/PRODUCT_ID
```

Requires:

```text
SUPER_ADMIN
```

---

## Important distinction

Your system now has **two levels of configuration**:

```text
SystemConfig
    │
    ├── Global system rules
    │     ├── minimum loan amount
    │     ├── maximum loan amount
    │     ├── maximum active loans
    │     └── security/auth settings
    │
    └── General application settings


LoanProduct
    │
    ├── Standard Loan
    │     ├── amount limits
    │     ├── interest rate
    │     ├── repayment days
    │     └── fees
    │
    ├── Emergency Loan
    │
    └── Business Loan
```

This gives us flexibility later. **SystemConfig controls global rules**, while **LoanProduct controls the characteristics of each loan type**.

The next logical step is to create a **SystemConfig seed file** so you can populate all the default configurations with one command instead of manually sending 10+ POST requests.
