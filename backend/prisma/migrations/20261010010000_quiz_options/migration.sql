-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "requireQuizzesForCertificate" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "maxAttempts" INTEGER,
ADD COLUMN     "shuffleOptions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "QuizQuestion" ADD COLUMN     "explanation" TEXT;

