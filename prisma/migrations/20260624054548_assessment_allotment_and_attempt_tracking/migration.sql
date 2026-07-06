/*
  Warnings:

  - Added the required column `attemptedCount` to the `AssessmentResult` table without a default value. This is not possible if the table is not empty.
  - Added the required column `correctCount` to the `AssessmentResult` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalQuestions` to the `AssessmentResult` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "EventAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "allottedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    CONSTRAINT "EventAssessment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventAssessment_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AssessmentResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assessmentId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "attemptedCount" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "attemptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mode" TEXT NOT NULL,
    CONSTRAINT "AssessmentResult_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssessmentResult_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssessmentResult_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- Backfill: pre-existing rows predate attempt tracking, so totalQuestions/attemptedCount are
-- reconstructed from the assessment's current question bank (the old flow required answering
-- every question), and correctCount is derived from the already-frozen score/totalMarks ratio.
INSERT INTO "new_AssessmentResult" ("id", "assessmentId", "participantId", "eventId", "totalQuestions", "attemptedCount", "correctCount", "score", "status", "attemptedAt", "mode")
SELECT
  ar."id",
  ar."assessmentId",
  ar."participantId",
  ar."eventId",
  (SELECT COUNT(*) FROM "AssessmentQuestion" q WHERE q."assessmentId" = ar."assessmentId") AS totalQuestions,
  (SELECT COUNT(*) FROM "AssessmentQuestion" q WHERE q."assessmentId" = ar."assessmentId") AS attemptedCount,
  COALESCE(CAST(ROUND(
    CAST(ar."score" AS REAL) / NULLIF(a."totalMarks", 0) *
    (SELECT COUNT(*) FROM "AssessmentQuestion" q WHERE q."assessmentId" = ar."assessmentId")
  ) AS INTEGER), 0) AS correctCount,
  ar."score",
  ar."status",
  ar."attemptedAt",
  ar."mode"
FROM "AssessmentResult" ar
JOIN "Assessment" a ON a."id" = ar."assessmentId";
DROP TABLE "AssessmentResult";
ALTER TABLE "new_AssessmentResult" RENAME TO "AssessmentResult";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EventAssessment_eventId_assessmentId_key" ON "EventAssessment"("eventId", "assessmentId");
