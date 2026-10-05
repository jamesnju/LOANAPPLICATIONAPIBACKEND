/*
  Warnings:

  - The values [COLLATERAL_DOCUMENT,GUARANTOR_DOCUMENT] on the enum `DocumentType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DocumentType_new" AS ENUM ('APPLICATION_FORM', 'NATIONAL_ID', 'PASSPORT', 'DRIVING_LICENSE', 'SELFIE', 'PROOF_OF_ADDRESS', 'EMPLOYMENT_LETTER', 'PAYSLIP', 'BANK_STATEMENT', 'BUSINESS_LICENSE', 'KRA_PIN', 'GUARANTOR_ID', 'GUARANTOR_PAYSLIP', 'COLLATERAL_OWNERSHIP', 'COLLATERAL_PHOTO', 'OTHER', 'NATIONAL_ID_FRONT', 'NATIONAL_ID_BACK', 'GUARANTOR_ID_FRONT', 'GUARANTOR_ID_BACK');
ALTER TABLE "Document" ALTER COLUMN "type" TYPE "DocumentType_new" USING ("type"::text::"DocumentType_new");
ALTER TYPE "DocumentType" RENAME TO "DocumentType_old";
ALTER TYPE "DocumentType_new" RENAME TO "DocumentType";
DROP TYPE "public"."DocumentType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Guarantor" ADD COLUMN     "idBackUrl" TEXT,
ADD COLUMN     "idFrontUrl" TEXT;
