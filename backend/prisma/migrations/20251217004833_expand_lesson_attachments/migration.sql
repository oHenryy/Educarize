/*
  Warnings:

  - Added the required column `updatedAt` to the `LessonAttachment` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LessonAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "category" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "thumbnailUrl" TEXT,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lessonId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LessonAttachment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LessonAttachment" ("createdAt", "fileSize", "fileType", "fileUrl", "id", "lessonId", "name", "updatedAt", "order", "downloadCount") SELECT "createdAt", "fileSize", "fileType", "fileUrl", "id", "lessonId", "name", "createdAt", 0, 0 FROM "LessonAttachment";
DROP TABLE "LessonAttachment";
ALTER TABLE "new_LessonAttachment" RENAME TO "LessonAttachment";
CREATE INDEX "LessonAttachment_lessonId_idx" ON "LessonAttachment"("lessonId");
CREATE INDEX "LessonAttachment_category_idx" ON "LessonAttachment"("category");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
