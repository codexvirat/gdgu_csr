-- CreateTable
CREATE TABLE "CertificateTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "tradeCategory" TEXT,
    "title" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "logos" TEXT NOT NULL DEFAULT '[]',
    "signatoryName" TEXT NOT NULL,
    "signatoryTitle" TEXT NOT NULL,
    "signatureImage" TEXT,
    "stampImage" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#1e3a8a',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CertificateTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventCertificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "certificateTemplateId" TEXT NOT NULL,
    "allottedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    CONSTRAINT "EventCertificate_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventCertificate_certificateTemplateId_fkey" FOREIGN KEY ("certificateTemplateId") REFERENCES "CertificateTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventCertificateId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "verifyToken" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Certificate_eventCertificateId_fkey" FOREIGN KEY ("eventCertificateId") REFERENCES "EventCertificate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Certificate_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Certificate_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EventCertificate_eventId_certificateTemplateId_key" ON "EventCertificate"("eventId", "certificateTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_certificateNumber_key" ON "Certificate"("certificateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_verifyToken_key" ON "Certificate"("verifyToken");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_eventCertificateId_participantId_key" ON "Certificate"("eventCertificateId", "participantId");
