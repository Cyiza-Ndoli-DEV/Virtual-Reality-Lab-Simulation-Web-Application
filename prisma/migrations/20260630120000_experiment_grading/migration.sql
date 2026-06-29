-- Teacher-assigned marks per component and experiment grade caps.

ALTER TABLE `Experiment`
    ADD COLUMN `gradeQuizMax` INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN `gradeQuestionnaireMax` INTEGER NOT NULL DEFAULT 35,
    ADD COLUMN `gradeReportMax` INTEGER NOT NULL DEFAULT 35;

ALTER TABLE `QuestionnaireSubmission`
    ADD COLUMN `marksAwarded` INTEGER NULL,
    ADD COLUMN `marksMax` INTEGER NULL;

ALTER TABLE `Report`
    ADD COLUMN `marksAwarded` INTEGER NULL,
    ADD COLUMN `marksMax` INTEGER NULL;

ALTER TABLE `QuizAttempt`
    ADD COLUMN `marksAwarded` INTEGER NULL,
    ADD COLUMN `marksMax` INTEGER NULL,
    ADD COLUMN `marksAwardedAt` DATETIME(3) NULL,
    ADD COLUMN `marksAwardedById` VARCHAR(191) NULL;
