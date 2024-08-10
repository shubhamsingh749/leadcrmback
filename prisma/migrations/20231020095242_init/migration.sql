/*
  Warnings:

  - You are about to alter the column `inquiryTimestamp` on the `lead` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.

*/
-- AlterTable
ALTER TABLE `lead` MODIFY `inquiryTimestamp` DATETIME NULL;
