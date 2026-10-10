-- AlterTable
ALTER TABLE "UserProgress" ADD COLUMN     "lastPositionSeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "videoDurationSeconds" INTEGER,
ADD COLUMN     "watchedSeconds" INTEGER NOT NULL DEFAULT 0;

