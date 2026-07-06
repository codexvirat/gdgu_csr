-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CertificateTemplate" (
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
    "layout" TEXT NOT NULL DEFAULT 'driiv',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CertificateTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CertificateTemplate" ("accentColor", "bodyText", "createdAt", "id", "logos", "projectId", "signatoryName", "signatoryTitle", "signatureImage", "stampImage", "title", "tradeCategory") SELECT "accentColor", "bodyText", "createdAt", "id", "logos", "projectId", "signatoryName", "signatoryTitle", "signatureImage", "stampImage", "title", "tradeCategory" FROM "CertificateTemplate";
DROP TABLE "CertificateTemplate";
ALTER TABLE "new_CertificateTemplate" RENAME TO "CertificateTemplate";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
