import { env } from "../config/env.js";

/* ============================================================
 * BASE URLS
 * ============================================================ */
const BASE =
  env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

/* ============================================================
 * TOKEN CACHE
 * ============================================================
 * Daraja tokens last ~1 hour. Cache the token in memory,
 * refresh 60 seconds before expiry, so we don't request a new
 * one on every STK Push.
 * ============================================================ */
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const auth = Buffer.from(
    `${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`,
  ).toString("base64");

  const res = await fetch(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    method: "GET",
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!res.ok) {
    throw new Error(
      `M-Pesa OAuth failed: ${res.status} ${await res.text()}`,
    );
  }

  const body = (await res.json()) as { access_token: string; expires_in: string };
  const expiresInSec = Number(body.expires_in) || 3600;

  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + expiresInSec * 1000,
  };

  return cachedToken.value;
}

/* ============================================================
 * TIMESTAMP
 * ============================================================
 * Daraja wants YYYYMMDDHHmmss in Nairobi time (EAT, UTC+3).
 * We compute it from UTC + 3h to avoid server-timezone issues.
 * ============================================================ */
function darajaTimestamp(date = new Date()): string {
  const eat = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    eat.getUTCFullYear().toString() +
    pad(eat.getUTCMonth() + 1) +
    pad(eat.getUTCDate()) +
    pad(eat.getUTCHours()) +
    pad(eat.getUTCMinutes()) +
    pad(eat.getUTCSeconds())
  );
}

/* ============================================================
 * STK PUSH
 * ============================================================
 * Initiates an STK Push. Returns Safaricom's correlation ids.
 * The customer receives a prompt on their phone.
 * ============================================================ */
export interface StkPushInput {
  phone: string;              // 2547XXXXXXXX
  amount: number;             // positive integer KES
  accountReference: string;   // shows on the customer's statement (usually loan number)
  transactionDesc: string;    // free text, ≤ 13 chars on the UI
  merchantRequestId?: string; // our own correlation id
}

export interface StkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}
export async function initiateStkPush(
  input: StkPushInput,
): Promise<StkPushResponse> {
  const token = await getAccessToken();
  console.log("[stk] token acquired, prefix:", token.slice(0, 20));

  const timestamp = darajaTimestamp();
  console.log("[stk] timestamp (EAT):", timestamp);

  const password = Buffer.from(
    `${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`,
  ).toString("base64");
  console.log("[stk] password base64 prefix:", password.slice(0, 20));

  const payload = {
    BusinessShortCode: env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: env.MPESA_TRANSACTION_TYPE,
    Amount: Math.round(input.amount),
    PartyA: input.phone,
    PartyB: env.MPESA_SHORTCODE,
    PhoneNumber: input.phone,
    CallBackURL: env.MPESA_CALLBACK_URL,
    AccountReference: input.accountReference.slice(0, 12),
    TransactionDesc: input.transactionDesc.slice(0, 13),
  };

  console.log("[stk] → POST", `${BASE}/mpesa/stkpush/v1/processrequest`);
  console.log("[stk] payload:", JSON.stringify(payload, null, 2));

  const res = await fetch(`${BASE}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const rawBody = await res.text();
  console.log("[stk] ← status:", res.status);
  console.log("[stk] ← body:", rawBody);

  let body: StkPushResponse;
  try {
    body = JSON.parse(rawBody) as StkPushResponse;
  } catch {
    throw new Error(`Safaricom returned non-JSON: ${rawBody}`);
  }

  if (!res.ok || body.ResponseCode !== "0") {
    throw new Error(
      `STK Push failed: ${body.ResponseCode ?? res.status} ${
        (body as any).errorMessage ?? body.ResponseDescription ?? "Unknown error"
      }`,
    );
  }

  return body;
}

// export async function initiateStkPush(
//   input: StkPushInput,
// ): Promise<StkPushResponse> {
//   const token = await getAccessToken();
//   const timestamp = darajaTimestamp();

//   const password = Buffer.from(
//     `${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`,
//   ).toString("base64");

//   const payload = {
//     BusinessShortCode: env.MPESA_SHORTCODE,
//     Password: password,
//     Timestamp: timestamp,
//     TransactionType: env.MPESA_TRANSACTION_TYPE,
//     Amount: Math.round(input.amount),      // Daraja requires an integer
//     PartyA: input.phone,                   // the paying customer
//     PartyB: env.MPESA_SHORTCODE,
//     PhoneNumber: input.phone,
//     CallBackURL: env.MPESA_CALLBACK_URL,
//     AccountReference: input.accountReference.slice(0, 12),
//     TransactionDesc: input.transactionDesc.slice(0, 13),
//   };

//   const res = await fetch(`${BASE}/mpesa/stkpush/v1/processrequest`, {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${token}`,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify(payload),
//   });

//   const body = (await res.json()) as StkPushResponse;

//   /* Daraja returns 200 even on failure; the ResponseCode tells
//    * the real story ("0" = success). */
//   if (!res.ok || body.ResponseCode !== "0") {
//     throw new Error(
//       `STK Push failed: ${body.ResponseCode ?? res.status} ${
//         body.ResponseDescription ?? "Unknown error"
//       }`,
//     );
//   }

//   return body;
// }

/* ============================================================
 * QUERY STK STATUS
 * ============================================================
 * Used by the reconciliation job when a callback never arrives.
 * ============================================================ */
export interface StkQueryResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
}

export async function queryStkStatus(
  checkoutRequestId: string,
): Promise<StkQueryResponse> {
  const token = await getAccessToken();
  const timestamp = darajaTimestamp();

  const password = Buffer.from(
    `${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`,
  ).toString("base64");

  const res = await fetch(`${BASE}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });

  return (await res.json()) as StkQueryResponse;
}

/* ============================================================
 * PHONE NORMALISATION
 * ============================================================
 * Accepts 07..., 01..., 2547..., +2547..., etc., and returns
 * the canonical 2547XXXXXXXX form Daraja expects.
 * ============================================================ */
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");

  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.length === 9 && (digits.startsWith("7") || digits.startsWith("1"))) {
    return `254${digits}`;
  }

  throw new Error(`Invalid Kenyan phone number: ${raw}`);
}