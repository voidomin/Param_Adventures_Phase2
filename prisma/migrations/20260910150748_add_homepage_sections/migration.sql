-- CreateEnum
CREATE TYPE "HomepageSectionLayout" AS ENUM ('MOSAIC_GRID', 'SPOTLIGHT_MANIFEST', 'PILGRIMAGE_TRAIL', 'SPEC_PANELS', 'ALTITUDE_TICKER');

-- AlterTable
ALTER TABLE "Experience" ADD COLUMN     "homepageSectionId" TEXT;

-- CreateTable
CREATE TABLE "HomepageSection" (
    "id" TEXT NOT NULL,
    "layout" "HomepageSectionLayout" NOT NULL,
    "name" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "subheading" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomepageSection_layout_key" ON "HomepageSection"("layout");

-- CreateIndex
CREATE INDEX "Experience_homepageSectionId_idx" ON "Experience"("homepageSectionId");

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_homepageSectionId_fkey" FOREIGN KEY ("homepageSectionId") REFERENCES "HomepageSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
