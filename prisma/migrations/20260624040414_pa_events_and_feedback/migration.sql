-- CreateTable
CREATE TABLE "EventPA" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventPA_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventPA_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeedbackForm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "tradeCategory" TEXT,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeedbackForm_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeedbackQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feedbackFormId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    CONSTRAINT "FeedbackQuestion_feedbackFormId_fkey" FOREIGN KEY ("feedbackFormId") REFERENCES "FeedbackForm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeedbackResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feedbackFormId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeedbackResponse_feedbackFormId_fkey" FOREIGN KEY ("feedbackFormId") REFERENCES "FeedbackForm" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FeedbackResponse_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FeedbackResponse_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeedbackAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "ratingValue" INTEGER,
    "textValue" TEXT,
    CONSTRAINT "FeedbackAnswer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "FeedbackResponse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FeedbackAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "FeedbackQuestion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "projectCityId" TEXT NOT NULL,
    "venueId" TEXT,
    "name" TEXT NOT NULL,
    "eventDateStart" DATETIME NOT NULL,
    "eventDateEnd" DATETIME NOT NULL,
    "targetCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "requiresAssessment" BOOLEAN NOT NULL DEFAULT true,
    "opsManagerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Event_projectCityId_fkey" FOREIGN KEY ("projectCityId") REFERENCES "ProjectCity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Event_opsManagerId_fkey" FOREIGN KEY ("opsManagerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("createdAt", "eventDateEnd", "eventDateStart", "id", "name", "opsManagerId", "projectCityId", "projectId", "status", "targetCount", "venueId") SELECT "createdAt", "eventDateEnd", "eventDateStart", "id", "name", "opsManagerId", "projectCityId", "projectId", "status", "targetCount", "venueId" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EventPA_eventId_userId_key" ON "EventPA"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackResponse_feedbackFormId_participantId_key" ON "FeedbackResponse"("feedbackFormId", "participantId");
