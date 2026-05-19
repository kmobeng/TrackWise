/*
  Warnings:

  - You are about to drop the column `monthYear` on the `Budget` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `Budget` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `amount` on the `CategoryBudget` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - A unique constraint covering the columns `[userId]` on the table `Budget` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[budgetId,categoryId]` on the table `CategoryBudget` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Budget_userId_monthYear_key";

-- AlterTable
ALTER TABLE "Budget" DROP COLUMN "monthYear",
ALTER COLUMN "amount" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "CategoryBudget" ALTER COLUMN "amount" SET DATA TYPE INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Budget_userId_key" ON "Budget"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryBudget_budgetId_categoryId_key" ON "CategoryBudget"("budgetId", "categoryId");
