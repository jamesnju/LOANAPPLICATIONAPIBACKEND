-- CreateEnum
CREATE TYPE "MpesaStkStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'TIMEOUT', 'CANCELLED');

-- CreateTable
CREATE TABLE "MpesaStkRequest" (
    "id" UUID NOT NULL,
    "merchantRequestId" TEXT NOT NULL,
    "checkoutRequestId" TEXT,
    "paymentId" UUID NOT NULL,
    "loanId" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "accountReference" TEXT,
    "requestBody" JSONB NOT NULL,
    "callbackBody" JSONB,
    "resultCode" INTEGER,
    "resultDesc" TEXT,
    "callbackReceivedAt" TIMESTAMP(3),
    "reconciledAt" TIMESTAMP(3),
    "status" "MpesaStkStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MpesaStkRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MpesaStkRequest_merchantRequestId_key" ON "MpesaStkRequest"("merchantRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "MpesaStkRequest_checkoutRequestId_key" ON "MpesaStkRequest"("checkoutRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "MpesaStkRequest_paymentId_key" ON "MpesaStkRequest"("paymentId");

-- CreateIndex
CREATE INDEX "MpesaStkRequest_loanId_idx" ON "MpesaStkRequest"("loanId");

-- CreateIndex
CREATE INDEX "MpesaStkRequest_status_idx" ON "MpesaStkRequest"("status");

-- CreateIndex
CREATE INDEX "MpesaStkRequest_createdAt_idx" ON "MpesaStkRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "MpesaStkRequest" ADD CONSTRAINT "MpesaStkRequest_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MpesaStkRequest" ADD CONSTRAINT "MpesaStkRequest_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
