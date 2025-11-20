-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "reward" INTEGER NOT NULL,
    "deadline" DATETIME,
    "where" TEXT NOT NULL,
    "address" TEXT,
    "exclusive" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "photos" TEXT NOT NULL DEFAULT '[]',
    "proof" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Task" ("address", "authorId", "category", "createdAt", "deadline", "desc", "exclusive", "id", "locale", "photos", "reward", "skill", "status", "title", "updatedAt", "where") SELECT "address", "authorId", "category", "createdAt", "deadline", "desc", "exclusive", "id", "locale", "photos", "reward", "skill", "status", "title", "updatedAt", "where" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
