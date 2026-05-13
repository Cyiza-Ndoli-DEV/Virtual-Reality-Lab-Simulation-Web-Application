-- CreateTable
CREATE TABLE `RolePermission` (
    `id` VARCHAR(191) NOT NULL,
    `roleDefinitionId` VARCHAR(191) NOT NULL,
    `featureKey` VARCHAR(191) NOT NULL,
    `allowed` BOOLEAN NOT NULL DEFAULT false,

    INDEX `RolePermission_roleDefinitionId_idx`(`roleDefinitionId`),
    UNIQUE INDEX `RolePermission_roleDefinitionId_featureKey_key`(`roleDefinitionId`, `featureKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_roleDefinitionId_fkey` FOREIGN KEY (`roleDefinitionId`) REFERENCES `RoleDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
