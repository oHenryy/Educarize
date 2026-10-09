-- Certificados passam a guardar uma cópia dos dados do curso no momento da emissão e
-- não são mais apagados quando o curso é excluído (courseId vira opcional, ON DELETE SET NULL).
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Certificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pdfUrl" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "courseTitle" TEXT NOT NULL,
    "courseDurationHours" INTEGER NOT NULL DEFAULT 0,
    "instructorName" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Preenche a cópia dos dados para os certificados já emitidos.
INSERT INTO "new_Certificate" ("id", "pdfUrl", "userId", "courseId", "courseTitle", "courseDurationHours", "instructorName", "studentName", "issuedAt")
SELECT
    c."id",
    c."pdfUrl",
    c."userId",
    c."courseId",
    COALESCE(co."title", 'Curso removido'),
    COALESCE(co."durationHours", 0),
    COALESCE(i."name", 'Instrutor'),
    COALESCE(u."name", ''),
    c."issuedAt"
FROM "Certificate" c
LEFT JOIN "Course" co ON co."id" = c."courseId"
LEFT JOIN "User" i ON i."id" = co."instructorId"
LEFT JOIN "User" u ON u."id" = c."userId";
DROP TABLE "Certificate";
ALTER TABLE "new_Certificate" RENAME TO "Certificate";
CREATE INDEX "Certificate_userId_idx" ON "Certificate"("userId");
CREATE INDEX "Certificate_courseId_idx" ON "Certificate"("courseId");
CREATE UNIQUE INDEX "Certificate_userId_courseId_key" ON "Certificate"("userId", "courseId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
