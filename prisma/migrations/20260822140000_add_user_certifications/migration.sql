-- AlterTable
ALTER TABLE "User" ADD COLUMN     "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[];
