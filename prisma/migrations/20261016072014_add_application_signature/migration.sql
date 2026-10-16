-- CreateEnum
CREATE TYPE "SignatureMethod" AS ENUM ('TYPED_NAME', 'DRAWN', 'OTP_CONFIRMED');

-- CreateTable
CREATE TABLE "ApplicationSignature" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "documentHash" TEXT NOT NULL,
    "signedPayload" JSONB NOT NULL,
    "method" "SignatureMethod" NOT NULL DEFAULT 'TYPED_NAME',
    "signatureData" TEXT,
    "agreedToTerms" BOOLEAN NOT NULL DEFAULT false,
    "agreedToPrivacy" BOOLEAN NOT NULL DEFAULT false,
    "agreedToDebit" BOOLEAN NOT NULL DEFAULT false,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationSignature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationSignature_applicationId_key" ON "ApplicationSignature"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationSignature_userId_idx" ON "ApplicationSignature"("userId");

-- CreateIndex
CREATE INDEX "ApplicationSignature_documentHash_idx" ON "ApplicationSignature"("documentHash");

-- AddForeignKey
ALTER TABLE "ApplicationSignature" ADD CONSTRAINT "ApplicationSignature_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationSignature" ADD CONSTRAINT "ApplicationSignature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
