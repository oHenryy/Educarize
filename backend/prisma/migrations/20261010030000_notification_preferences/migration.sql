-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('GENERAL', 'ENROLLMENT', 'PROGRESS', 'QUIZ', 'CERTIFICATE', 'COMMENT', 'REVIEW', 'MESSAGE');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "category" "NotificationCategory" NOT NULL DEFAULT 'GENERAL';

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "userId" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "email" BOOLEAN NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId","category")
);

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

