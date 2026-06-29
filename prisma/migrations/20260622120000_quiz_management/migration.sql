-- Quiz management: normalized questions, options, answers, and publishing workflow.

-- AlterTable Quiz
ALTER TABLE `Quiz`
    ADD COLUMN `description` TEXT NOT NULL DEFAULT (''),
    ADD COLUMN `passMark` INTEGER NOT NULL DEFAULT 60,
    ADD COLUMN `timeLimit` INTEGER NULL,
    ADD COLUMN `attemptsAllowed` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `shuffleQuestions` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isPublished` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- AlterTable QuizAttempt
ALTER TABLE `QuizAttempt`
    CHANGE COLUMN `totalQuestions` `totalPoints` INTEGER NOT NULL,
    ADD COLUMN `percentage` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `passed` BOOLEAN NOT NULL DEFAULT false,
    MODIFY COLUMN `answers` JSON NULL;

-- Backfill percentage from score/totalPoints where possible
UPDATE `QuizAttempt`
SET `percentage` = CASE
    WHEN `totalPoints` > 0 THEN ROUND((`score` / `totalPoints`) * 100)
    ELSE 0
END
WHERE `percentage` = 0;

-- CreateTable QuizQuestion
CREATE TABLE `QuizQuestion` (
    `id` VARCHAR(191) NOT NULL,
    `quizId` VARCHAR(191) NOT NULL,
    `questionText` TEXT NOT NULL,
    `questionType` ENUM('MCQ', 'TRUE_FALSE') NOT NULL,
    `points` INTEGER NOT NULL DEFAULT 1,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `QuizQuestion_quizId_displayOrder_idx`(`quizId`, `displayOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable QuizOption
CREATE TABLE `QuizOption` (
    `id` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `optionText` TEXT NOT NULL,
    `isCorrect` BOOLEAN NOT NULL DEFAULT false,

    INDEX `QuizOption_questionId_idx`(`questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable QuizAnswer
CREATE TABLE `QuizAnswer` (
    `id` VARCHAR(191) NOT NULL,
    `attemptId` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `selectedOptionId` VARCHAR(191) NULL,
    `isCorrect` BOOLEAN NOT NULL DEFAULT false,

    INDEX `QuizAnswer_attemptId_idx`(`attemptId`),
    INDEX `QuizAnswer_questionId_idx`(`questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Drop legacy JSON questions column from Quiz
ALTER TABLE `Quiz` DROP COLUMN `questions`;

-- CreateIndex
CREATE INDEX `Quiz_experimentId_idx` ON `Quiz`(`experimentId`);
CREATE INDEX `Quiz_experimentId_isPublished_idx` ON `Quiz`(`experimentId`, `isPublished`);
CREATE INDEX `QuizAttempt_quizId_idx` ON `QuizAttempt`(`quizId`);
CREATE INDEX `QuizAttempt_studentId_idx` ON `QuizAttempt`(`studentId`);
CREATE INDEX `QuizAttempt_quizId_studentId_idx` ON `QuizAttempt`(`quizId`, `studentId`);

-- AddForeignKey
ALTER TABLE `QuizQuestion` ADD CONSTRAINT `QuizQuestion_quizId_fkey` FOREIGN KEY (`quizId`) REFERENCES `Quiz`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `QuizOption` ADD CONSTRAINT `QuizOption_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `QuizQuestion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `QuizAnswer` ADD CONSTRAINT `QuizAnswer_attemptId_fkey` FOREIGN KEY (`attemptId`) REFERENCES `QuizAttempt`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `QuizAnswer` ADD CONSTRAINT `QuizAnswer_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `QuizQuestion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `QuizAnswer` ADD CONSTRAINT `QuizAnswer_selectedOptionId_fkey` FOREIGN KEY (`selectedOptionId`) REFERENCES `QuizOption`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Update Quiz FK to cascade on experiment delete
ALTER TABLE `Quiz` DROP FOREIGN KEY `Quiz_experimentId_fkey`;
ALTER TABLE `Quiz` ADD CONSTRAINT `Quiz_experimentId_fkey` FOREIGN KEY (`experimentId`) REFERENCES `Experiment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Update QuizAttempt FK to cascade on quiz delete
ALTER TABLE `QuizAttempt` DROP FOREIGN KEY `QuizAttempt_quizId_fkey`;
ALTER TABLE `QuizAttempt` ADD CONSTRAINT `QuizAttempt_quizId_fkey` FOREIGN KEY (`quizId`) REFERENCES `Quiz`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
