-- AlterTable
ALTER TABLE `quiz` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `quizattempt` ALTER COLUMN `percentage` DROP DEFAULT;

-- AlterTable
ALTER TABLE `report` ALTER COLUMN `updatedAt` DROP DEFAULT;
