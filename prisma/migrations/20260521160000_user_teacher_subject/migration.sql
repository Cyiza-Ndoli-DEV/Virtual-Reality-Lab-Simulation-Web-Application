-- AlterTable
ALTER TABLE `User` ADD COLUMN `subjectId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `User_subjectId_idx` ON `User`(`subjectId`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
