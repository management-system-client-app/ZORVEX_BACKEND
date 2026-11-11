-- Allow catalog items outside apparel to use inventory variants without
-- clothing-specific size and fabric records.
ALTER TABLE "Product"
  ALTER COLUMN "gender" SET DEFAULT 'UNISEX';

ALTER TABLE "ProductVariant"
  ALTER COLUMN "sizeId" DROP NOT NULL,
  ALTER COLUMN "fabricId" DROP NOT NULL,
  ADD COLUMN "optionLabel" TEXT;

ALTER TABLE "OrderItem"
  ADD COLUMN "optionLabel" TEXT;
