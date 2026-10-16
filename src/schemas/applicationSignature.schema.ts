import { z } from "zod";

export const signApplicationSchema = z.object({
  method: z.enum(["TYPED_NAME", "DRAWN", "OTP_CONFIRMED"]),
  signatureData: z.string().min(1).max(500).optional(),

  /* Consent flags — must be strictly true. */
  agreedToTerms: z
    .boolean()
    .refine((v) => v === true, {
      message: "You must accept the terms.",
    }),
  agreedToPrivacy: z
    .boolean()
    .refine((v) => v === true, {
      message: "You must accept the privacy policy.",
    }),
  agreedToDebit: z
    .boolean()
    .refine((v) => v === true, {
      message: "You must accept the debit mandate.",
    }),

  /* The terms version the customer saw. */
  termsVersion: z.coerce.number().int().positive(),
  termsHash: z.string().regex(/^[a-f0-9]{64}$/, "Invalid terms hash"),
});

export const verifySignatureQuerySchema = z.object({
  hash: z.string().regex(/^[a-f0-9]{64}$/, "Invalid hash format"),
});