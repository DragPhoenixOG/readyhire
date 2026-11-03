-- CreateEnum
CREATE TYPE "InterviewInviteStatus" AS ENUM ('OPEN', 'BOOKED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Interview" ADD COLUMN     "inviteId" TEXT,
ADD COLUMN     "reminder24hSentAt" TIMESTAMP(3),
ADD COLUMN     "reminder2hSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "InterviewInvite" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "round" TEXT NOT NULL,
    "durationMins" INTEGER NOT NULL DEFAULT 45,
    "mode" "InterviewMode" NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "status" "InterviewInviteStatus" NOT NULL DEFAULT 'OPEN',
    "declineNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewInviteSlot" (
    "id" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewInviteSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterviewInvite_applicationId_status_idx" ON "InterviewInvite"("applicationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewInviteSlot_inviteId_startsAt_key" ON "InterviewInviteSlot"("inviteId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Interview_inviteId_key" ON "Interview"("inviteId");

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "InterviewInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewInvite" ADD CONSTRAINT "InterviewInvite_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewInviteSlot" ADD CONSTRAINT "InterviewInviteSlot_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "InterviewInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

