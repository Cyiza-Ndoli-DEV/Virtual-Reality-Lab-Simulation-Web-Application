-- Widen avatarUrl for Vercel Blob URLs and optional inline data URLs
ALTER TABLE `User` MODIFY COLUMN `avatarUrl` LONGTEXT NULL;
