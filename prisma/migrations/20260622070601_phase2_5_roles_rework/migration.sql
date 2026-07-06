/*
  Warnings:

  - You are about to drop the `Certificate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "Certificate_qrCodeValue_key";

-- DropIndex
DROP INDEX "Certificate_certificateNumber_key";

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN "pinHash" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Certificate";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "clientId" TEXT,
    "volunteerEventId" TEXT,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_volunteerEventId_fkey" FOREIGN KEY ("volunteerEventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("clientId", "companyId", "createdAt", "email", "id", "lastLoginAt", "name", "passwordHash", "phone", "role", "status") SELECT "clientId", "companyId", "createdAt", "email", "id", "lastLoginAt", "name", "passwordHash", "phone", "role", "status" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
