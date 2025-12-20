/*
  Warnings:

  - Made the column `list` on table `Item` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "sort" DROP DEFAULT,
ALTER COLUMN "list" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Skip" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Skip_id_seq";

-- CreateIndex
CREATE INDEX "Item_list_sort_idx" ON "Item"("list", "sort");
