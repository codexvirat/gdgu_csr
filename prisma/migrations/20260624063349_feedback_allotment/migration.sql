-- CreateTable
CREATE TABLE "EventFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "feedbackFormId" TEXT NOT NULL,
    "allottedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    CONSTRAINT "EventFeedback_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventFeedback_feedbackFormId_fkey" FOREIGN KEY ("feedbackFormId") REFERENCES "FeedbackForm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EventFeedback_eventId_feedbackFormId_key" ON "EventFeedback"("eventId", "feedbackFormId");
