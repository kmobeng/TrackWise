-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordChangeAt" TIMESTAMP(3),
ALTER COLUMN "role" DROP NOT NULL;
