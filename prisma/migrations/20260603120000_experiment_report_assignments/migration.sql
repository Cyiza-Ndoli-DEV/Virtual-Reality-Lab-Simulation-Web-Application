-- CreateTable
CREATE TABLE `ExperimentReportAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `experimentId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `instructions` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ExperimentReportAssignment_experimentId_key`(`experimentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Remove legacy rows (pre-assignment reports cannot be migrated)
DELETE FROM `Report`;

-- AlterTable
ALTER TABLE `Report` DROP FOREIGN KEY `Report_experimentId_fkey`;
ALTER TABLE `Report`
    ADD COLUMN `assignmentId` VARCHAR(191) NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `reviewStatus` ENUM('PENDING', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `reviewedAt` DATETIME(3) NULL,
    ADD COLUMN `reviewedById` VARCHAR(191) NULL,
    ADD COLUMN `sessionId` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `Report_studentId_experimentId_key` ON `Report`(`studentId`, `experimentId`);
CREATE UNIQUE INDEX `Report_sessionId_key` ON `Report`(`sessionId`);
CREATE INDEX `Report_assignmentId_idx` ON `Report`(`assignmentId`);
CREATE INDEX `Report_reviewStatus_idx` ON `Report`(`reviewStatus`);

ALTER TABLE `Report` ADD CONSTRAINT `Report_experimentId_fkey` FOREIGN KEY (`experimentId`) REFERENCES `Experiment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Report` ADD CONSTRAINT `Report_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `ExperimentReportAssignment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Report` ADD CONSTRAINT `Report_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `ExperimentSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ExperimentReportAssignment` ADD CONSTRAINT `ExperimentReportAssignment_experimentId_fkey` FOREIGN KEY (`experimentId`) REFERENCES `Experiment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
