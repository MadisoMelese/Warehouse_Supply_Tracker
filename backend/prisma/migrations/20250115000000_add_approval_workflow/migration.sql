-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('AVAILABLE', 'ISSUED');

-- CreateEnum
CREATE TYPE "MovementStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- Create default category first
INSERT INTO "Category" (name, description, "createdAt", "updatedAt")
VALUES ('General', 'General items category', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Add updatedAt to User table with default
ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Convert role to enum (first update existing values)
UPDATE "User" SET role = 'USER' WHERE role = 'user' OR role IS NULL;
UPDATE "User" SET role = 'ADMIN' WHERE role = 'admin';

-- Alter role column to use enum
ALTER TABLE "User" DROP COLUMN IF EXISTS "role";
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

-- Update any remaining NULL roles
UPDATE "User" SET role = 'USER' WHERE role IS NULL;

-- Add barcode and categoryId to Item (with defaults first)
ALTER TABLE "Item" ADD COLUMN "barcode" TEXT;
ALTER TABLE "Item" ADD COLUMN "categoryId" INTEGER;
ALTER TABLE "Item" ADD COLUMN "status" "ItemStatus" NOT NULL DEFAULT 'AVAILABLE';

-- Generate barcodes for existing items
UPDATE "Item" 
SET barcode = 'BC' || LPAD(id::text, 10, '0') || LPAD(EXTRACT(EPOCH FROM NOW())::bigint::text, 6, '0')
WHERE barcode IS NULL;

-- Assign existing items to default category
UPDATE "Item" 
SET "categoryId" = (SELECT id FROM "Category" WHERE name = 'General' LIMIT 1)
WHERE "categoryId" IS NULL;

-- Make barcode and categoryId required
ALTER TABLE "Item" ALTER COLUMN "barcode" SET NOT NULL;
ALTER TABLE "Item" ALTER COLUMN "categoryId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Item_barcode_key" ON "Item"("barcode");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add new columns to Movement
ALTER TABLE "Movement" ADD COLUMN "status" "MovementStatus" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "Movement" ADD COLUMN "requestedById" INTEGER;
ALTER TABLE "Movement" ADD COLUMN "approvedById" INTEGER;
ALTER TABLE "Movement" ADD COLUMN "isReturned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Movement" ADD COLUMN "returnedAt" TIMESTAMP(3);
ALTER TABLE "Movement" ADD COLUMN "notes" TEXT;
ALTER TABLE "Movement" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Assign existing movements to first admin user (or create system user if none exists)
DO $$
DECLARE
    admin_user_id INTEGER;
    first_user_id INTEGER;
BEGIN
    -- Try to get an admin user
    SELECT id INTO admin_user_id FROM "User" WHERE role = 'ADMIN' LIMIT 1;
    
    -- If no admin, get first user
    IF admin_user_id IS NULL THEN
        SELECT id INTO first_user_id FROM "User" LIMIT 1;
        admin_user_id := first_user_id;
    END IF;
    
    -- Update existing movements
    UPDATE "Movement" 
    SET "requestedById" = admin_user_id,
        "approvedById" = admin_user_id,
        status = 'APPROVED'
    WHERE "requestedById" IS NULL;
END $$;

-- Make requestedById required
ALTER TABLE "Movement" ALTER COLUMN "requestedById" SET NOT NULL;

-- AddForeignKeys
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

