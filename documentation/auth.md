Sure. Below are **sample requests and responses for the Loan Platform authentication APIs** based on your current schema and auth code.

## 1. Register User

**Endpoint**

`POST /api/v1/auth/register`

### Request

```json
{
  "firstName": "James",
  "lastName": "Muniu",
  "email": "james@example.com",
  "phone": "0712345678",
  "password": "SecurePass123!",
  "verificationChannel": "EMAIL"
}
```

### Response — 201 Created

```json
{
  "success": true,
  "message": "Account created. Verification code sent.",
  "data": {
    "id": "8f4c5d9e-8d21-4e7a-bf1b-8a4e4f3e9c12",
    "firstName": "James",
    "lastName": "Muniu",
    "email": "james@example.com",
    "phone": "0712345678",
    "emailVerified": false,
    "phoneVerified": false,
    "message": "Account created. Please verify your account using the verification code."
  }
}
```

The OTP is **not returned in the API response**. It is sent through the selected channel.

For example, if `verificationChannel` is `EMAIL`, the user receives something like:

```text
Your Loan Platform verification code is: 483921

This code expires in 10 minutes.
```

---

# 2. Verify Account

**Endpoint**

`POST /api/v1/auth/verify`

### Request

Use the `id` returned during registration:

```json
{
  "userId": "8f4c5d9e-8d21-4e7a-bf1b-8a4e4f3e9c12",
  "code": "483921"
}
```

### Response — 200 OK

```json
{
  "success": true,
  "message": "Account verified successfully.",
  "data": {
    "id": "8f4c5d9e-8d21-4e7a-bf1b-8a4e4f3e9c12",
    "firstName": "James",
    "lastName": "Muniu",
    "email": "james@example.com",
    "phone": "0712345678",
    "emailVerified": true,
    "phoneVerified": false,
    "role": "CUSTOMER",
    "status": "ACTIVE"
  }
}
```

Because the OTP was sent using `EMAIL`, `emailVerified` becomes `true`.

If the user registered with:

```json
{
  "verificationChannel": "SMS"
}
```

then successful verification would result in:

```json
{
  "emailVerified": false,
  "phoneVerified": true
}
```

---

# 3. Login

**Endpoint**

`POST /api/v1/auth/login`

### Request using email

```json
{
  "identifier": "james@example.com",
  "password": "SecurePass123!"
}
```

You can also use the phone number:

```json
{
  "identifier": "0712345678",
  "password": "SecurePass123!"
}
```

### Response — 200 OK

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4ZjRjNWQ5ZS04ZDIxLTRlN2EtYmYxYi04YTRlNGYzZTljMTIiLCJyb2xlIjoiQ1VTVE9NRVIiLCJpYXQiOjE3NTg3OTAwMDB9.example",
    "refreshToken": "9c5d6f1a8b3e7d2c4f6a9b1e8d5c7f3a2b4c6d8e1f9a7b5c3d2e4f6a8b0c1d",
    "user": {
      "id": "8f4c5d9e-8d21-4e7a-bf1b-8a4e4f3e9c12",
      "firstName": "James",
      "lastName": "Muniu",
      "email": "james@example.com",
      "phone": "0712345678",
      "role": "CUSTOMER",
      "status": "ACTIVE",
      "emailVerified": true,
      "phoneVerified": false
    }
  }
}
```

> The tokens above are **sample values**, not real tokens.

---

# 4. Login — Unverified Account

If the user hasn't verified either email or phone:

### Request

```json
{
  "identifier": "john@example.com",
  "password": "SecurePass123!"
}
```

### Response — 403 Forbidden

```json
{
  "success": false,
  "code": "ACCOUNT_NOT_VERIFIED",
  "message": "Please verify your account before logging in."
}
```

---

# 5. Login — Wrong Password

### Request

```json
{
  "identifier": "james@example.com",
  "password": "WrongPassword123!"
}
```

### Response — 401 Unauthorized

```json
{
  "success": false,
  "message": "Invalid email/phone or password"
}
```

---

# 6. Refresh Access Token

When the access token expires, the mobile/web application sends the refresh token.

**Endpoint**

`POST /api/v1/auth/refresh`

### Request

```json
{
  "refreshToken": "9c5d6f1a8b3e7d2c4f6a9b1e8d5c7f3a2b4c6d8e1f9a7b5c3d2e4f6a8b0c1d"
}
```

### Response — 200 OK

```json
{
  "success": true,
  "message": "Access token refreshed.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.NEW_ACCESS_TOKEN_EXAMPLE"
  }
}
```

The refresh token itself is currently **not replaced**. Your current implementation only generates a new access token.

---

# 7. Invalid Refresh Token

### Request

```json
{
  "refreshToken": "invalid-refresh-token"
}
```

### Response — 401 Unauthorized

```json
{
  "success": false,
  "message": "Invalid refresh token"
}
```

---

# 8. Logout

**Endpoint**

`POST /api/v1/auth/logout`

### Request

```json
{
  "refreshToken": "9c5d6f1a8b3e7d2c4f6a9b1e8d5c7f3a2b4c6d8e1f9a7b5c3d2e4f6a8b0c1d"
}
```

### Response — 200 OK

```json
{
  "success": true,
  "message": "Logout successful."
}
```

Behind the scenes, your system sets:

```text
RefreshToken.revokedAt
```

to the current date/time.

---

# 9. Invalid OTP

**Endpoint**

`POST /api/v1/auth/verify`

### Request

```json
{
  "userId": "8f4c5d9e-8d21-4e7a-bf1b-8a4e4f3e9c12",
  "code": "123456"
}
```

### Response — 400 Bad Request

```json
{
  "success": false,
  "message": "Invalid verification code"
}
```

The `attempts` field in `OtpCode` is incremented.

---

# 10. Expired OTP

### Response

```json
{
  "success": false,
  "message": "Verification code has expired"
}
```

---

## Complete authentication flow

Your frontend/mobile app will basically follow this sequence:

```text
                    ┌─────────────────┐
                    │    REGISTER     │
                    └────────┬────────┘
                             │
                             ▼
                    User created
                    emailVerified=false
                    phoneVerified=false
                             │
                             ▼
                    Generate 6-digit OTP
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
                  EMAIL              SMS
                    │                 │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │     VERIFY      │
                    └────────┬────────┘
                             │
                             ▼
                    Account verified
                             │
                             ▼
                    ┌─────────────────┐
                    │      LOGIN      │
                    └────────┬────────┘
                             │
                             ▼
                 ┌───────────────────────┐
                 │ Access Token          │
                 │ Refresh Token         │
                 └───────────┬───────────┘
                             │
                             ▼
                       Use API
                             │
                             ▼
                  Access token expires
                             │
                             ▼
                    ┌─────────────────┐
                    │     REFRESH     │
                    └────────┬────────┘
                             │
                             ▼
                    New Access Token
                             │
                             ▼
                    Continue using API
```

### One important thing for your Loan Platform

The authentication is now only the **identity layer**. After this, we can build the actual loan APIs around the models we created:

```text
AUTH
 ├── Register
 ├── OTP Verification
 ├── Login
 ├── Refresh Token
 └── Logout

CUSTOMER
 ├── Profile
 ├── Documents
 └── Guarantors

LOAN
 ├── Loan Products
 ├── Applications
 ├── Approvals
 ├── Disbursement
 ├── Repayment Schedule
 ├── Payments
 └── Loan Transactions

ADMIN
 ├── Users
 ├── Loan Products
 ├── System Config
 ├── Applications
 ├── Approvals
 └── Reports
```

The **next logical step is the Loan Product + SystemConfig APIs**, because those determine things like minimum/maximum loan amount, interest rate, repayment days, processing fee, and late-payment penalty.
