-- User.role: store RoleDefinition.code as string (supports custom roles).
ALTER TABLE `User` MODIFY COLUMN `role` VARCHAR(191) NOT NULL DEFAULT 'STUDENT';
