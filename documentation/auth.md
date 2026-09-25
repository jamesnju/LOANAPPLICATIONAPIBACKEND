Authentication API documentation

Here is the documentation we can eventually put into Swagger/OpenAPI.

1. Register
Request
POST /api/v1/auth/register
Content-Type: application/json
{
  "email": "james@example.com",
  "phone": "+254712345678",
  "password": "SecurePassword123!",
  "firstName": "James",
  "lastName": "Njuguna",
  "verificationChannel": "SMS"
}
Response
{
  "success": true,
  "message": "Account created. Verification code sent.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "james@example.com",
    "phone": "+254712345678",
    "verified": false,
    "message": "Account created. Please verify your account using the verification code."
  }
}

The SMS received by the user would contain something like:

Your verification code is 583214.
This code expires in 10 minutes.
2. Verify account
Request
POST /api/v1/auth/verify
Content-Type: application/json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "code": "583214"
}
Successful response
{
  "success": true,
  "message": "Account verified successfully.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "james@example.com",
    "phone": "+254712345678",
    "emailVerified": false,
    "phoneVerified": true
  }
}
3. Login
Request

The customer can use either email:

{
  "identifier": "james@example.com",
  "password": "SecurePassword123!"
}

or phone:

{
  "identifier": "+254712345678",
  "password": "SecurePassword123!"
}
Successful response
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "a-long-random-refresh-token...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "james@example.com",
      "phone": "+254712345678",
      "role": "CUSTOMER",
      "emailVerified": false,
      "phoneVerified": true
    }
  }
}
4. Unverified login

If the user registers but doesn't verify their account and tries:

POST /api/v1/auth/login

they receive:

{
  "success": false,
  "code": "ACCOUNT_NOT_VERIFIED",
  "message": "Please verify your account before logging in."
}

No access token is issued.

5. Refresh token
Request
POST /api/v1/auth/refresh
Content-Type: application/json
{
  "refreshToken": "a-long-random-refresh-token..."
}
Response
{
  "success": true,
  "message": "Access token refreshed.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
6. Logout
Request
POST /api/v1/auth/logout
Content-Type: application/json
{
  "refreshToken": "a-long-random-refresh-token..."
}
Response
{
  "success": true,
  "message": "Logout successful."
}
One design point I recommend for this loan platform

We're allowing verification through either SMS or email, and the login check is:

const accountVerified =
  user.emailVerified || user.phoneVerified;

So if the customer chooses SMS:

Registration
    ↓
SMS OTP
    ↓
phoneVerified = true
    ↓
LOGIN ALLOWED

If they choose email:

Registration
    ↓
Email OTP
    ↓
emailVerified = true
    ↓
LOGIN ALLOWED

This gives us the flexibility you requested without requiring the customer to verify both channels before they can use the platform.

One thing I would change before production: add a dedicated resend-verification-code endpoint with rate limiting, plus account lockout/rate limiting on login and OTP attempts. The basic authentication flow above is ready for development, but those protections should be added before exposing the API publicly.