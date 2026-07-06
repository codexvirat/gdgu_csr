-- RedefineTables: replace imageKey (single, nullable) with imageKeys (JSON array string)
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Venue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "contactPerson" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "capacity" INTEGER,
    "facilities" TEXT,
    "rateCard" TEXT,
    "imageKeys" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Venue_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Venue" ("id", "companyId", "name", "address", "city", "state", "contactPerson", "contactPhone", "contactEmail", "capacity", "facilities", "rateCard", "imageKeys", "createdAt")
SELECT
    "id", "companyId", "name", "address", "city", "state", "contactPerson", "contactPhone", "contactEmail", "capacity", "facilities", "rateCard",
    CASE WHEN "imageKey" IS NULL THEN '[]' ELSE '["' || replace("imageKey", '"', '\"') || '"]' END,
    "createdAt"
FROM "Venue";
DROP TABLE "Venue";
ALTER TABLE "new_Venue" RENAME TO "Venue";
PRAGMA foreign_keys=ON;
