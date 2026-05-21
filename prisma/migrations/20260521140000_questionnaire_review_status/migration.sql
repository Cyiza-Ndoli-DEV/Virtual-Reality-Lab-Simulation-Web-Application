-- AlterTable
ALTER TABLE `QuestionnaireSubmission` ADD COLUMN `reviewStatus` ENUM('PENDING', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `reviewedAt` DATETIME(3) NULL,
    ADD COLUMN `reviewedById` VARCHAR(191) NULL;
