# KYC & LOAN APPLICATION API DOCUMENTATION

**API Version:** v1
**Base URL:** `/api/v1`
**Authentication:** JWT Bearer Token
**Content-Type:** `application/json`

---

# 1. KYC API

KYC (Know Your Customer) is used to collect and verify customer identification information before allowing a customer to access lending services.

The KYC process contains:

1. Customer submits personal information.
2. Customer submits identification details.
3. System stores the KYC information.
4. Administrator/system verifies the submitted information.
5. KYC status is updated.
6. A customer can apply for a loan once the required KYC requirements have been satisfied.

---

## 1.1 KYC Status

A KYC record can have one of the following statuses:

| Status     | Description                                            |
| ---------- | ------------------------------------------------------ |
| `PENDING`  | KYC information has been submitted but not reviewed    |
| `VERIFIED` | KYC information has been successfully verified         |
| `REJECTED` | KYC information was rejected                           |
| `EXPIRED`  | Previously verified KYC information is no longer valid |

---

# 2. Create KYC

Creates a KYC record for the authenticated customer.

### Endpoint

```http
POST /api/v1/kyc
```

### Authentication

```http
Authorization: Bearer <access_token>
```

### Request Headers

```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

---

## Request Body

```json
{
  "firstName": "John",
  "middleName": "Kamau",
  "lastName": "Mwangi",
  "dateOfBirth": "1995-05-15",
  "nationality": "KE",
  "idType": "NATIONAL_ID",
  "idNumber": "12345678",
  "gender": "MALE",
  "phoneNumber": "0712345678",
  "email": "john@example.com",
  "address": "Nairobi",
  "county": "Nairobi",
  "occupation": "Software Developer"
}
```

---

## Request Fields

| Field         | Type   | Required | Description                          |
| ------------- | ------ | -------: | ------------------------------------ |
| `firstName`   | string |      Yes | Customer's first name                |
| `middleName`  | string |       No | Customer's middle name               |
| `lastName`    | string |      Yes | Customer's last name                 |
| `dateOfBirth` | string |      Yes | Date of birth in `YYYY-MM-DD` format |
| `nationality` | string |      Yes | Country/nationality code             |
| `idType`      | string |      Yes | Type of identification document      |
| `idNumber`    | string |      Yes | Identification document number       |
| `gender`      | string |      Yes | Customer gender                      |
| `phoneNumber` | string |      Yes | Customer phone number                |
| `email`       | string |      Yes | Customer email address               |
| `address`     | string |       No | Physical/postal address              |
| `county`      | string |       No | Customer county                      |
| `occupation`  | string |       No | Customer occupation                  |

---

## Supported ID Types

Example values:

```text
NATIONAL_ID
PASSPORT
ALIEN_ID
DRIVING_LICENSE
```

---

## Supported Gender Values

```text
MALE
FEMALE
OTHER
```

---

# 3. Create KYC — Sample Response

### HTTP 201 Created

```json
{
  "success": true,
  "message": "KYC information submitted successfully",
  "data": {
    "id": "kyc_01JXYZ123456",
    "userId": "user_01JXYZ987654",
    "firstName": "John",
    "middleName": "Kamau",
    "lastName": "Mwangi",
    "dateOfBirth": "1995-05-15",
    "nationality": "KE",
    "idType": "NATIONAL_ID",
    "idNumber": "12345678",
    "gender": "MALE",
    "phoneNumber": "0712345678",
    "email": "john@example.com",
    "address": "Nairobi",
    "county": "Nairobi",
    "occupation": "Software Developer",
    "status": "PENDING",
    "createdAt": "2026-09-25T17:00:00.000Z",
    "updatedAt": "2026-09-25T17:00:00.000Z"
  }
}
```

---

# 4. Get My KYC

Returns the KYC information belonging to the authenticated customer.

### Endpoint

```http
GET /api/v1/kyc/me
```

### Authentication

```http
Authorization: Bearer <access_token>
```

---

## Sample Request

```http
GET /api/v1/kyc/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## Sample Response

### HTTP 200 OK

```json
{
  "success": true,
  "message": "KYC information retrieved successfully",
  "data": {
    "id": "kyc_01JXYZ123456",
    "userId": "user_01JXYZ987654",
    "firstName": "John",
    "middleName": "Kamau",
    "lastName": "Mwangi",
    "dateOfBirth": "1995-05-15",
    "nationality": "KE",
    "idType": "NATIONAL_ID",
    "idNumber": "12345678",
    "gender": "MALE",
    "phoneNumber": "0712345678",
    "email": "john@example.com",
    "address": "Nairobi",
    "county": "Nairobi",
    "occupation": "Software Developer",
    "status": "VERIFIED",
    "verifiedAt": "2026-09-25T18:30:00.000Z"
  }
}
```

---

# 5. Update KYC

Allows an authenticated customer to update their KYC information before verification.

### Endpoint

```http
PATCH /api/v1/kyc
```

### Authentication

```http
Authorization: Bearer <access_token>
```

---

## Sample Request

```json
{
  "phoneNumber": "0798765432",
  "address": "Westlands, Nairobi",
  "occupation": "Software Engineer"
}
```

---

## Sample Response

### HTTP 200 OK

```json
{
  "success": true,
  "message": "KYC information updated successfully",
  "data": {
    "id": "kyc_01JXYZ123456",
    "phoneNumber": "0798765432",
    "address": "Westlands, Nairobi",
    "occupation": "Software Engineer",
    "status": "PENDING",
    "updatedAt": "2026-09-25T19:00:00.000Z"
  }
}
```

---

# 6. Verify KYC

This endpoint is intended for an authorized administrator or verification officer.

### Endpoint

```http
PATCH /api/v1/kyc/:id/verify
```

### Authentication

```http
Authorization: Bearer <admin_access_token>
```

---

## Sample Request

```http
PATCH /api/v1/kyc/kyc_01JXYZ123456/verify
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json
```

### Request Body

```json
{
  "status": "VERIFIED",
  "remarks": "Identity documents verified successfully"
}
```

---

## Sample Response

### HTTP 200 OK

```json
{
  "success": true,
  "message": "KYC verified successfully",
  "data": {
    "id": "kyc_01JXYZ123456",
    "status": "VERIFIED",
    "remarks": "Identity documents verified successfully",
    "verifiedAt": "2026-09-25T19:10:00.000Z",
    "verifiedBy": "admin_01JXYZ"
  }
}
```

---

# 7. Reject KYC

Rejects submitted KYC information.

### Endpoint

```http
PATCH /api/v1/kyc/:id/reject
```

### Authentication

```http
Authorization: Bearer <admin_access_token>
```

---

## Sample Request

```json
{
  "remarks": "Identification information could not be verified"
}
```

---

## Sample Response

### HTTP 200 OK

```json
{
  "success": true,
  "message": "KYC rejected successfully",
  "data": {
    "id": "kyc_01JXYZ123456",
    "status": "REJECTED",
    "remarks": "Identification information could not be verified",
    "updatedAt": "2026-09-25T19:15:00.000Z"
  }
}
```

---

# 8. KYC Validation Error

If required information is missing or invalid:

### HTTP 400 Bad Request

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "idNumber",
      "message": "ID number is required"
    },
    {
      "field": "dateOfBirth",
      "message": "Invalid date format"
    }
  ]
}
```

---

# 9. Loan Application API

The Loan Application API allows authenticated customers to apply for a loan product.

The relationship is:

```text
User
  │
  └── KYC
       │
       └── Loan Application
              │
              └── Loan Product
```

A loan application contains:

* Loan product
* Requested amount
* Repayment period
* Purpose
* Optional notes
* Application status

---

# 10. Loan Application Status

A loan application can have the following statuses:

| Status         | Description                                           |
| -------------- | ----------------------------------------------------- |
| `PENDING`      | Application has been submitted and is awaiting review |
| `UNDER_REVIEW` | Application is currently being reviewed               |
| `APPROVED`     | Application has been approved                         |
| `REJECTED`     | Application has been rejected                         |
| `CANCELLED`    | Customer cancelled the application                    |
| `DISBURSED`    | Approved loan has been disbursed                      |

---

# 11. Create Loan Application

Creates a new loan application for the authenticated customer.

### Endpoint

```http
POST /api/v1/loan-applications
```

### Authentication

```http
Authorization: Bearer <access_token>
```

---

## Request Body

```json
{
  "productId": "loan_product_01JXYZ123",
  "requestedAmount": 50000,
  "repaymentDays": 90,
  "purpose": "Business working capital",
  "notes": "Funds will be used to purchase additional stock."
}
```

---

# 12. Loan Application Request Fields

| Field             | Type   | Required | Description                    |
| ----------------- | ------ | -------: | ------------------------------ |
| `productId`       | string |      Yes | ID of the loan product         |
| `requestedAmount` | number |      Yes | Amount requested               |
| `repaymentDays`   | number |      Yes | Requested repayment period     |
| `purpose`         | string |      Yes | Reason for requesting the loan |
| `notes`           | string |       No | Additional information         |

---

# 13. Important Loan Application Validation

When a customer submits an application, the backend should verify:

### 1. Loan product exists

```text
productId
```

must reference an existing loan product.

### 2. Loan product is active

The customer cannot apply for an inactive loan product.

### 3. Amount is within product limits

For example:

```text
Minimum amount = KES 5,000
Maximum amount = KES 100,000
```

Therefore:

```text
requestedAmount >= 5,000
requestedAmount <= 100,000
```

### 4. Repayment period is within product limits

For example:

```text
Minimum repayment days = 30
Maximum repayment days = 180
```

Therefore:

```text
repaymentDays >= 30
repaymentDays <= 180
```

### 5. KYC requirement

The customer should have completed the required KYC process before applying.

Example:

```text
KYC status = VERIFIED
```

### 6. Existing loan restrictions

The system can check whether the customer already has an active loan or another pending application, depending on the business rules.

### 7. System configuration

Global restrictions such as maximum loan amount, minimum loan amount, maximum repayment period, interest rate, and other configurable values should be read from the system configuration where applicable.

---

# 14. Create Loan Application — Sample Response

### HTTP 201 Created

```json
{
  "success": true,
  "message": "Loan application submitted successfully",
  "data": {
    "id": "loan_application_01JXYZ456",
    "userId": "user_01JXYZ987654",
    "productId": "loan_product_01JXYZ123",
    "requestedAmount": 50000,
    "repaymentDays": 90,
    "purpose": "Business working capital",
    "notes": "Funds will be used to purchase additional stock.",
    "status": "PENDING",
    "createdAt": "2026-09-25T19:30:00.000Z",
    "updatedAt": "2026-09-25T19:30:00.000Z"
  }
}
```

---

# 15. Get My Loan Applications

Returns loan applications belonging to the authenticated customer.

### Endpoint

```http
GET /api/v1/loan-applications/me
```

### Authentication

```http
Authorization: Bearer <access_token>
```

---

## Sample Request

```http
GET /api/v1/loan-applications/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## Sample Response

### HTTP 200 OK

```json
{
  "success": true,
  "message": "Loan applications retrieved successfully",
  "data": [
    {
      "id": "loan_application_01JXYZ456",
      "productId": "loan_product_01JXYZ123",
      "product": {
        "id": "loan_product_01JXYZ123",
        "name": "Standard Loan",
        "interestRate": 10
      },
      "requestedAmount": 50000,
      "repaymentDays": 90,
      "purpose": "Business working capital",
      "notes": "Funds will be used to purchase additional stock.",
      "status": "PENDING",
      "createdAt": "2026-09-25T19:30:00.000Z",
      "updatedAt": "2026-09-25T19:30:00.000Z"
    }
  ]
}
```

---

# 16. Get Single Loan Application

Returns a specific loan application belonging to the authenticated customer.

### Endpoint

```http
GET /api/v1/loan-applications/:id
```

### Authentication

```http
Authorization: Bearer <access_token>
```

---

## Sample Request

```http
GET /api/v1/loan-applications/loan_application_01JXYZ456
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## Sample Response

### HTTP 200 OK

```json
{
  "success": true,
  "message": "Loan application retrieved successfully",
  "data": {
    "id": "loan_application_01JXYZ456",
    "userId": "user_01JXYZ987654",
    "productId": "loan_product_01JXYZ123",
    "product": {
      "id": "loan_product_01JXYZ123",
      "name": "Standard Loan",
      "minAmount": 5000,
      "maxAmount": 100000,
      "interestRate": 10,
      "minRepaymentDays": 30,
      "maxRepaymentDays": 180
    },
    "requestedAmount": 50000,
    "repaymentDays": 90,
    "purpose": "Business working capital",
    "notes": "Funds will be used to purchase additional stock.",
    "status": "PENDING",
    "createdAt": "2026-09-25T19:30:00.000Z",
    "updatedAt": "2026-09-25T19:30:00.000Z"
  }
}
```

---

# 17. Cancel Loan Application

Allows a customer to cancel an application that has not yet been approved or disbursed.

### Endpoint

```http
PATCH /api/v1/loan-applications/:id/cancel
```

### Authentication

```http
Authorization: Bearer <access_token>
```

---

## Sample Request

```http
PATCH /api/v1/loan-applications/loan_application_01JXYZ456/cancel
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json
```

### Request Body

```json
{
  "reason": "I no longer require the loan."
}
```

---

## Sample Response

### HTTP 200 OK

```json
{
  "success": true,
  "message": "Loan application cancelled successfully",
  "data": {
    "id": "loan_application_01JXYZ456",
    "status": "CANCELLED",
    "cancelReason": "I no longer require the loan.",
    "updatedAt": "2026-09-25T20:00:00.000Z"
  }
}
```

---

# 18. Review Loan Application

This endpoint is intended for authorized loan officers or administrators.

### Endpoint

```http
PATCH /api/v1/loan-applications/:id/review
```

### Authentication

```http
Authorization: Bearer <admin_access_token>
```

---

## Sample Request

```json
{
  "status": "UNDER_REVIEW",
  "remarks": "Application received and currently being assessed."
}
```

---

## Sample Response

### HTTP 200 OK

```json
{
  "success": true,
  "message": "Loan application updated successfully",
  "data": {
    "id": "loan_application_01JXYZ456",
    "status": "UNDER_REVIEW",
    "remarks": "Application received and currently being assessed.",
    "reviewedBy": "admin_01JXYZ",
    "reviewedAt": "2026-09-25T20:10:00.000Z",
    "updatedAt": "2026-09-25T20:10:00.000Z"
  }
}
```

---

# 19. Approve Loan Application

Approves a loan application after review.

### Endpoint

```http
PATCH /api/v1/loan-applications/:id/approve
```

### Authentication

```http
Authorization: Bearer <admin_access_token>
```

---

## Sample Request

```json
{
  "approvedAmount": 50000,
  "repaymentDays": 90,
  "interestRate": 10,
  "remarks": "Application approved after successful assessment."
}
```

---

## Sample Response

### HTTP 200 OK

```json
{
  "success": true,
  "message": "Loan application approved successfully",
  "data": {
    "id": "loan_application_01JXYZ456",
    "status": "APPROVED",
    "requestedAmount": 50000,
    "approvedAmount": 50000,
    "repaymentDays": 90,
    "interestRate": 10,
    "remarks": "Application approved after successful assessment.",
    "approvedBy": "admin_01JXYZ",
    "approvedAt": "2026-09-25T20:20:00.000Z"
  }
}
```

---

# 20. Reject Loan Application

Rejects a loan application.

### Endpoint

```http
PATCH /api/v1/loan-applications/:id/reject
```

### Authentication

```http
Authorization: Bearer <admin_access_token>
```

---

## Sample Request

```json
{
  "reason": "The application does not meet the current lending criteria."
}
```

---

## Sample Response

### HTTP 200 OK

```json
{
  "success": true,
  "message": "Loan application rejected successfully",
  "data": {
    "id": "loan_application_01JXYZ456",
    "status": "REJECTED",
    "rejectionReason": "The application does not meet the current lending criteria.",
    "rejectedBy": "admin_01JXYZ",
    "rejectedAt": "2026-09-25T20:25:00.000Z"
  }
}
```

---

# 21. Loan Application — Amount Validation Error

If the customer requests an amount below the product minimum:

### HTTP 400 Bad Request

```json
{
  "success": false,
  "message": "Requested amount is below the minimum allowed amount",
  "errors": [
    {
      "field": "requestedAmount",
      "message": "Minimum loan amount is KES 5,000"
    }
  ]
}
```

---

# 22. Loan Application — Maximum Amount Error

```json
{
  "success": false,
  "message": "Requested amount exceeds the maximum allowed amount",
  "errors": [
    {
      "field": "requestedAmount",
      "message": "Maximum loan amount is KES 100,000"
    }
  ]
}
```

---

# 23. Loan Application — Repayment Period Error

```json
{
  "success": false,
  "message": "Invalid repayment period",
  "errors": [
    {
      "field": "repaymentDays",
      "message": "Repayment period must be between 30 and 180 days"
    }
  ]
}
```

---

# 24. Loan Application — KYC Not Verified

If the customer attempts to apply without completing KYC:

### HTTP 403 Forbidden

```json
{
  "success": false,
  "message": "KYC verification is required before applying for a loan",
  "code": "KYC_NOT_VERIFIED"
}
```

---

# 25. Loan Application — Product Not Found

### HTTP 404 Not Found

```json
{
  "success": false,
  "message": "Loan product not found",
  "code": "LOAN_PRODUCT_NOT_FOUND"
}
```

---

# 26. Loan Application — Product Inactive

### HTTP 400 Bad Request

```json
{
  "success": false,
  "message": "The selected loan product is currently inactive",
  "code": "LOAN_PRODUCT_INACTIVE"
}
```

---

# 27. Duplicate/Pending Application

If the business rules prevent multiple pending applications:

### HTTP 409 Conflict

```json
{
  "success": false,
  "message": "You already have a pending loan application",
  "code": "PENDING_APPLICATION_EXISTS"
}
```

---

# 28. Authentication Error

If the access token is missing:

### HTTP 401 Unauthorized

```json
{
  "success": false,
  "message": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

If the token is invalid or expired:

```json
{
  "success": false,
  "message": "Invalid or expired access token",
  "code": "INVALID_TOKEN"
}
```

---

# 29. Recommended Customer Loan Application Flow

The normal customer flow should be:

```text
1. Register
      ↓
2. Login
      ↓
3. Receive JWT access token
      ↓
4. Submit KYC
      ↓
5. KYC = PENDING
      ↓
6. KYC verification
      ↓
7. KYC = VERIFIED
      ↓
8. View available loan products
      ↓
9. Select loan product
      ↓
10. Submit loan application
      ↓
11. Application = PENDING
      ↓
12. Loan officer reviews application
      ↓
13. Application = UNDER_REVIEW
      ↓
14. Application approved/rejected
      ↓
15. If approved
      ↓
16. Loan created
      ↓
17. Loan disbursed
```

---

# 30. Relationship Between Loan Product, Loan Application and Loan

The three entities have different purposes.

```text
LOAN PRODUCT
     │
     │ defines
     ↓
┌─────────────────────────────┐
│ Standard Loan               │
│ Min: KES 5,000              │
│ Max: KES 100,000            │
│ Interest: 10%               │
│ Repayment: 30–180 days      │
└─────────────────────────────┘
              │
              │ selected by customer
              ↓
┌─────────────────────────────┐
│ LOAN APPLICATION             │
│ Requested: KES 50,000       │
│ Repayment: 90 days          │
│ Status: PENDING             │
└─────────────────────────────┘
              │
              │ approved
              ↓
┌─────────────────────────────┐
│ LOAN                         │
│ Principal: KES 50,000       │
│ Interest: 10%               │
│ Repayment: 90 days          │
│ Status: ACTIVE              │
└─────────────────────────────┘
```

A **Loan Product** defines the rules.

A **Loan Application** is the customer's request to use that product.

A **Loan** is created after the application has been approved.

---

# 31. API Endpoint Summary

## KYC

| Method  | Endpoint                 | Purpose            |
| ------- | ------------------------ | ------------------ |
| `POST`  | `/api/v1/kyc`            | Create KYC         |
| `GET`   | `/api/v1/kyc/me`         | Get customer's KYC |
| `PATCH` | `/api/v1/kyc`            | Update KYC         |
| `PATCH` | `/api/v1/kyc/:id/verify` | Verify KYC         |
| `PATCH` | `/api/v1/kyc/:id/reject` | Reject KYC         |

## Loan Applications

| Method  | Endpoint                                | Purpose                     |
| ------- | --------------------------------------- | --------------------------- |
| `POST`  | `/api/v1/loan-applications`             | Create application          |
| `GET`   | `/api/v1/loan-applications/me`          | Get customer's applications |
| `GET`   | `/api/v1/loan-applications/:id`         | Get one application         |
| `PATCH` | `/api/v1/loan-applications/:id/cancel`  | Cancel application          |
| `PATCH` | `/api/v1/loan-applications/:id/review`  | Review application          |
| `PATCH` | `/api/v1/loan-applications/:id/approve` | Approve application         |
| `PATCH` | `/api/v1/loan-applications/:id/reject`  | Reject application          |

---

# 32. Authorization Summary

| Operation               | Customer | Loan Officer/Admin |
| ----------------------- | -------: | -----------------: |
| Submit KYC              |      Yes |                 No |
| View own KYC            |      Yes |               Yes* |
| Update own KYC          |      Yes |                 No |
| Verify KYC              |       No |                Yes |
| Reject KYC              |       No |                Yes |
| Create loan application |      Yes |                 No |
| View own application    |      Yes |               Yes* |
| Cancel own application  |      Yes |                 No |
| Review application      |       No |                Yes |
| Approve application     |       No |                Yes |
| Reject application      |       No |                Yes |

`*` Subject to the application's authorization rules.

---

# 33. Standard API Response Structure

Successful responses should generally follow:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

Error responses should generally follow:

```json
{
  "success": false,
  "message": "Operation failed",
  "code": "ERROR_CODE",
  "errors": []
}
```

This gives the frontend a consistent structure for handling both successful and failed API requests.
