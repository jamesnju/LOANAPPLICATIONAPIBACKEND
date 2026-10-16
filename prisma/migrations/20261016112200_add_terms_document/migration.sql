-- AlterTable
ALTER TABLE "ApplicationSignature" ADD COLUMN     "termsHash" TEXT,
ADD COLUMN     "termsVersion" INTEGER;

-- CreateTable
CREATE TABLE "TermsDocument" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "contentHash" TEXT NOT NULL,
    "editedById" UUID,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TermsDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TermsDocument_isPublished_idx" ON "TermsDocument"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "TermsDocument_version_key" ON "TermsDocument"("version");

-- AddForeignKey
ALTER TABLE "TermsDocument" ADD CONSTRAINT "TermsDocument_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
