-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "restrictedReason" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "termsAcceptedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "website" TEXT,
    "city" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RecruiterProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT,
    "phone" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedAt" DATETIME,
    "reviewedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecruiterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecruiterProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecruiterProfile_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "headline" TEXT,
    "currentCompany" TEXT,
    "currentTitle" TEXT,
    "experienceYears" REAL,
    "skills" TEXT,
    "noticePeriodDays" INTEGER,
    "resignationDate" DATETIME,
    "lastWorkingDay" DATETIME,
    "verificationStatus" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED',
    "submittedAt" DATETIME,
    "verifiedAt" DATETIME,
    "verifiedById" TEXT,
    "verificationMethod" TEXT,
    "verificationNotes" TEXT,
    "rejectionReason" TEXT,
    "committedApplicationId" TEXT,
    "committedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CandidateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CandidateProfile_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CandidateProfile_committedApplicationId_fkey" FOREIGN KEY ("committedApplicationId") REFERENCES "Application" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedAt" DATETIME,
    "reviewedById" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "ctcLpa" REAL,
    "offeredOn" DATETIME,
    "joiningDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'HOLDING',
    "documentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Offer_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Offer_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recruiterId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "workMode" TEXT NOT NULL DEFAULT 'HYBRID',
    "minExperience" INTEGER NOT NULL DEFAULT 0,
    "maxExperience" INTEGER,
    "skills" TEXT NOT NULL,
    "ctcMinLpa" REAL,
    "ctcMaxLpa" REAL,
    "maxJoiningDays" INTEGER,
    "openings" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Job_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "RecruiterProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "coverNote" TEXT,
    "respondedAt" DATETIME,
    "responseMessage" TEXT,
    "rejectionCategory" TEXT,
    "rejectionReason" TEXT,
    "offerCtcLpa" REAL,
    "offerJoiningDate" DATETIME,
    "outcomeAt" DATETIME,
    "notJoinedReason" TEXT,
    "withdrawnReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "round" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "durationMins" INTEGER NOT NULL DEFAULT 45,
    "mode" TEXT NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "candidateConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Interview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApplicationEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApplicationEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApplicationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GhostingReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolutionNote" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GhostingReport_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GhostingReport_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GhostingReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Company_domain_key" ON "Company"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "RecruiterProfile_userId_key" ON "RecruiterProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProfile_userId_key" ON "CandidateProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProfile_committedApplicationId_key" ON "CandidateProfile"("committedApplicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_storedName_key" ON "Document"("storedName");

-- CreateIndex
CREATE INDEX "Document_candidateId_type_idx" ON "Document"("candidateId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_documentId_key" ON "Offer"("documentId");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Application_jobId_candidateId_key" ON "Application"("jobId", "candidateId");

-- CreateIndex
CREATE INDEX "ApplicationEvent_applicationId_createdAt_idx" ON "ApplicationEvent"("applicationId", "createdAt");
