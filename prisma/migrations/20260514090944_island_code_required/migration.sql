/*
  Warnings:

  - Made the column `code` on table `Island` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Island" ALTER COLUMN "code" SET NOT NULL;
