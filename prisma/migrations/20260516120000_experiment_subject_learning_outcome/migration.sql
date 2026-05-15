-- AlterTable
ALTER TABLE `Experiment` ADD COLUMN `learningOutcome` TEXT NOT NULL DEFAULT '';
ALTER TABLE `Experiment` ADD COLUMN `subjectId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Experiment_subjectId_idx` ON `Experiment`(`subjectId`);

-- AddForeignKey
ALTER TABLE `Experiment` ADD CONSTRAINT `Experiment_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
