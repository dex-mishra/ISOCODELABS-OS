-- CreateEnum
CREATE TYPE "ChildBrandProductType" AS ENUM ('CHILD_PRODUCT', 'DAUGHTER_COMPANY');

-- CreateEnum
CREATE TYPE "ChildBrandStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "child_brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "product_type" "ChildBrandProductType" NOT NULL,
    "mission" TEXT,
    "vision" TEXT,
    "enemy" TEXT,
    "target_audience" TEXT,
    "promise" TEXT,
    "story" TEXT,
    "voice" TEXT,
    "vocabulary" TEXT[],
    "tagline" TEXT,
    "messaging" TEXT,
    "custom_colors" JSONB,
    "custom_logo_url" TEXT,
    "status" "ChildBrandStatus" NOT NULL DEFAULT 'DRAFT',
    "compliance_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_brands_pkey" PRIMARY KEY ("id")
);
