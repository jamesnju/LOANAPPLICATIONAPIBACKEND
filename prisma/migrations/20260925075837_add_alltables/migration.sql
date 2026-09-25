/*
  Warnings:

  - The primary key for the `Document` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `cloudinaryPublicId` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `cloudinaryUrl` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `documentType` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `originalFilename` on the `Document` table. All the data in the column will be lost.
  - The primary key for the `RefreshToken` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `kycStatus` on the `User` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `CustomerProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OtpCode` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[nationalId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fileName` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileUrl` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `Document` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `Document` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `RefreshToken` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `RefreshToken` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `firstName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'LOAN_OFFICER', 'FINANCE_OFFICER', 'SUPPORT', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('EMPLOYED', 'SELF_EMPLOYED', 'BUSINESS_OWNER', 'STUDENT', 'UNEMPLOYED', 'OTHER');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED', 'DISBURSED');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('PENDING_DISBURSEMENT', 'ACTIVE', 'PARTIALLY_PAID', 'FULLY_PAID', 'OVERDUE', 'DEFAULTED', 'WRITTEN_OFF', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RepaymentStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'WAIVED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MPESA', 'BANK_TRANSFER', 'CASH', 'CARD', 'MOBILE_MONEY', 'OTHER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DISBURSEMENT', 'REPAYMENT', 'INTEREST', 'PENALTY', 'FEE', 'REFUND', 'ADJUSTMENT', 'WRITE_OFF');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('NATIONAL_ID', 'PASSPORT', 'PAYSLIP', 'BANK_STATEMENT', 'BUSINESS_LICENSE', 'KRA_PIN', 'COLLATERAL_DOCUMENT', 'GUARANTOR_DOCUMENT', 'PROOF_OF_ADDRESS', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPLICATION_SUBMITTED', 'APPLICATION_APPROVED', 'APPLICATION_REJECTED', 'LOAN_DISBURSED', 'REPAYMENT_DUE', 'REPAYMENT_OVERDUE', 'PAYMENT_RECEIVED', 'GENERAL');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "ConfigType" AS ENUM ('STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'JSON', 'DATE');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('SUBMIT', 'REVIEW', 'APPROVE', 'REJECT', 'CANCEL', 'REQUEST_DOCUMENTS');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'DISBURSE', 'REPAY', 'OTHER');

-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'BLOCKED';

-- DropForeignKey
ALTER TABLE "CustomerProfile" DROP CONSTRAINT "CustomerProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_userId_fkey";

-- DropForeignKey
ALTER TABLE "OtpCode" DROP CONSTRAINT "OtpCode_userId_fkey";

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- DropIndex
DROP INDEX "RefreshToken_tokenHash_key";

-- AlterTable
ALTER TABLE "Document" DROP CONSTRAINT "Document_pkey",
DROP COLUMN "cloudinaryPublicId",
DROP COLUMN "cloudinaryUrl",
DROP COLUMN "documentType",
DROP COLUMN "originalFilename",
ADD COLUMN     "applicationId" UUID,
ADD COLUMN     "collateralId" UUID,
ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "fileUrl" TEXT NOT NULL,
ADD COLUMN     "guarantorId" UUID,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "type" "DocumentType" NOT NULL,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedBy" TEXT,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
ALTER COLUMN "mimeType" DROP NOT NULL,
ADD CONSTRAINT "Document_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "kycStatus",
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "employerName" TEXT,
ADD COLUMN     "employmentType" "EmploymentType",
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "monthlyIncome" DECIMAL(18,2),
ADD COLUMN     "nationalId" TEXT,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "CustomerProfile";

-- DropTable
DROP TABLE "OtpCode";

-- DropEnum
DROP TYPE "KycStatus";

-- DropEnum
DROP TYPE "OtpPurpose";

-- DropEnum
DROP TYPE "UserRole";

-- DropEnum
DROP TYPE "VerificationChannel";

-- CreateTable
CREATE TABLE "LoanProduct" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "minAmount" DECIMAL(18,2) NOT NULL,
    "maxAmount" DECIMAL(18,2) NOT NULL,
    "minRepaymentDays" INTEGER NOT NULL,
    "maxRepaymentDays" INTEGER NOT NULL,
    "interestRate" DECIMAL(10,4) NOT NULL,
    "processingFee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "latePenaltyRate" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanApplication" (
    "id" UUID NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "loanProductId" UUID NOT NULL,
    "requestedAmount" DECIMAL(18,2) NOT NULL,
    "requestedDays" INTEGER NOT NULL,
    "interestRate" DECIMAL(10,4) NOT NULL,
    "processingFee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "purpose" TEXT,
    "description" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" UUID NOT NULL,
    "loanNumber" TEXT NOT NULL,
    "applicationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "loanProductId" UUID NOT NULL,
    "principalAmount" DECIMAL(18,2) NOT NULL,
    "interestRate" DECIMAL(10,4) NOT NULL,
    "interestAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "processingFee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "penaltyAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "amountPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "outstandingAmount" DECIMAL(18,2) NOT NULL,
    "repaymentDays" INTEGER NOT NULL,
    "disbursedAt" TIMESTAMP(3),
    "maturityDate" TIMESTAMP(3),
    "status" "LoanStatus" NOT NULL DEFAULT 'PENDING_DISBURSEMENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanApproval" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "approverId" UUID NOT NULL,
    "action" "ApprovalAction" NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepaymentSchedule" (
    "id" UUID NOT NULL,
    "loanId" UUID NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "principalAmount" DECIMAL(18,2) NOT NULL,
    "interestAmount" DECIMAL(18,2) NOT NULL,
    "penaltyAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "amountPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "outstandingAmount" DECIMAL(18,2) NOT NULL,
    "status" "RepaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepaymentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "paymentReference" TEXT NOT NULL,
    "loanId" UUID NOT NULL,
    "scheduleId" UUID,
    "amount" DECIMAL(18,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "transactionReference" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentDate" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanTransaction" (
    "id" UUID NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "loanId" UUID NOT NULL,
    "paymentId" UUID,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "balanceBefore" DECIMAL(18,2) NOT NULL,
    "balanceAfter" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guarantor" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "userId" UUID,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "nationalId" TEXT NOT NULL,
    "relationship" TEXT,
    "guaranteedAmount" DECIMAL(18,2),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guarantor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collateral" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimatedValue" DECIMAL(18,2) NOT NULL,
    "registrationNumber" TEXT,
    "ownershipDocument" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collateral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ConfigType" NOT NULL,
    "value" TEXT NOT NULL,
    "defaultValue" TEXT,
    "category" TEXT,
    "isEditable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoanProduct_code_key" ON "LoanProduct"("code");

-- CreateIndex
CREATE INDEX "LoanProduct_isActive_idx" ON "LoanProduct"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LoanApplication_applicationNumber_key" ON "LoanApplication"("applicationNumber");

-- CreateIndex
CREATE INDEX "LoanApplication_userId_idx" ON "LoanApplication"("userId");

-- CreateIndex
CREATE INDEX "LoanApplication_loanProductId_idx" ON "LoanApplication"("loanProductId");

-- CreateIndex
CREATE INDEX "LoanApplication_status_idx" ON "LoanApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_loanNumber_key" ON "Loan"("loanNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_applicationId_key" ON "Loan"("applicationId");

-- CreateIndex
CREATE INDEX "Loan_userId_idx" ON "Loan"("userId");

-- CreateIndex
CREATE INDEX "Loan_status_idx" ON "Loan"("status");

-- CreateIndex
CREATE INDEX "LoanApproval_applicationId_idx" ON "LoanApproval"("applicationId");

-- CreateIndex
CREATE INDEX "LoanApproval_approverId_idx" ON "LoanApproval"("approverId");

-- CreateIndex
CREATE INDEX "RepaymentSchedule_loanId_idx" ON "RepaymentSchedule"("loanId");

-- CreateIndex
CREATE INDEX "RepaymentSchedule_dueDate_idx" ON "RepaymentSchedule"("dueDate");

-- CreateIndex
CREATE INDEX "RepaymentSchedule_status_idx" ON "RepaymentSchedule"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RepaymentSchedule_loanId_installmentNumber_key" ON "RepaymentSchedule"("loanId", "installmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymentReference_key" ON "Payment"("paymentReference");

-- CreateIndex
CREATE INDEX "Payment_loanId_idx" ON "Payment"("loanId");

-- CreateIndex
CREATE INDEX "Payment_scheduleId_idx" ON "Payment"("scheduleId");

-- CreateIndex
CREATE INDEX "Payment_transactionReference_idx" ON "Payment"("transactionReference");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LoanTransaction_transactionNumber_key" ON "LoanTransaction"("transactionNumber");

-- CreateIndex
CREATE INDEX "LoanTransaction_loanId_idx" ON "LoanTransaction"("loanId");

-- CreateIndex
CREATE INDEX "LoanTransaction_paymentId_idx" ON "LoanTransaction"("paymentId");

-- CreateIndex
CREATE INDEX "LoanTransaction_type_idx" ON "LoanTransaction"("type");

-- CreateIndex
CREATE INDEX "LoanTransaction_createdAt_idx" ON "LoanTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "Guarantor_applicationId_idx" ON "Guarantor"("applicationId");

-- CreateIndex
CREATE INDEX "Guarantor_nationalId_idx" ON "Guarantor"("nationalId");

-- CreateIndex
CREATE INDEX "Guarantor_phone_idx" ON "Guarantor"("phone");

-- CreateIndex
CREATE INDEX "Collateral_applicationId_idx" ON "Collateral"("applicationId");

-- CreateIndex
CREATE INDEX "Collateral_registrationNumber_idx" ON "Collateral"("registrationNumber");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- CreateIndex
CREATE INDEX "SystemConfig_category_idx" ON "SystemConfig"("category");

-- CreateIndex
CREATE INDEX "SystemConfig_isActive_idx" ON "SystemConfig"("isActive");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Document_userId_idx" ON "Document"("userId");

-- CreateIndex
CREATE INDEX "Document_applicationId_idx" ON "Document"("applicationId");

-- CreateIndex
CREATE INDEX "Document_guarantorId_idx" ON "Document"("guarantorId");

-- CreateIndex
CREATE INDEX "Document_collateralId_idx" ON "Document"("collateralId");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "User_nationalId_key" ON "User"("nationalId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_loanProductId_fkey" FOREIGN KEY ("loanProductId") REFERENCES "LoanProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LoanApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_loanProductId_fkey" FOREIGN KEY ("loanProductId") REFERENCES "LoanProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApproval" ADD CONSTRAINT "LoanApproval_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApproval" ADD CONSTRAINT "LoanApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepaymentSchedule" ADD CONSTRAINT "RepaymentSchedule_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "RepaymentSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanTransaction" ADD CONSTRAINT "LoanTransaction_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanTransaction" ADD CONSTRAINT "LoanTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guarantor" ADD CONSTRAINT "Guarantor_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guarantor" ADD CONSTRAINT "Guarantor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collateral" ADD CONSTRAINT "Collateral_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LoanApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_guarantorId_fkey" FOREIGN KEY ("guarantorId") REFERENCES "Guarantor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_collateralId_fkey" FOREIGN KEY ("collateralId") REFERENCES "Collateral"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
