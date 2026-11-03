-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "earlyReminderSentAt" TIMESTAMP(3),
ADD COLUMN     "responseDraftUnedited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "responseDraftUsed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AiRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "purpose" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiRequest_createdAt_idx" ON "AiRequest"("createdAt");
