-- CreateTable
CREATE TABLE `ExperimentQuestionnaire` (
    `id` VARCHAR(191) NOT NULL,
    `experimentId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `sections` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ExperimentQuestionnaire_experimentId_key`(`experimentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuestionnaireSubmission` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `questionnaireId` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NULL,
    `answers` JSON NOT NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `scores` JSON NULL,
    `scoredAt` DATETIME(3) NULL,

    UNIQUE INDEX `QuestionnaireSubmission_sessionId_key`(`sessionId`),
    UNIQUE INDEX `QuestionnaireSubmission_studentId_questionnaireId_key`(`studentId`, `questionnaireId`),
    INDEX `QuestionnaireSubmission_questionnaireId_idx`(`questionnaireId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ExperimentQuestionnaire` ADD CONSTRAINT `ExperimentQuestionnaire_experimentId_fkey` FOREIGN KEY (`experimentId`) REFERENCES `Experiment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuestionnaireSubmission` ADD CONSTRAINT `QuestionnaireSubmission_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuestionnaireSubmission` ADD CONSTRAINT `QuestionnaireSubmission_questionnaireId_fkey` FOREIGN KEY (`questionnaireId`) REFERENCES `ExperimentQuestionnaire`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuestionnaireSubmission` ADD CONSTRAINT `QuestionnaireSubmission_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `ExperimentSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
