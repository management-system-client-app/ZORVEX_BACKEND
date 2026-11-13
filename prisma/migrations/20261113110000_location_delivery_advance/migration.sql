ALTER TABLE "Order"
  ADD COLUMN "shippingDivision" TEXT,
  ADD COLUMN "shippingDistrict" TEXT,
  ADD COLUMN "shippingThana" TEXT,
  ADD COLUMN "deliveryAdvanceAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "codAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0;

UPDATE "Order"
SET "shippingDistrict" = "shippingCity"
WHERE "shippingDistrict" IS NULL;

UPDATE "Order"
SET "codAmount" = "total"
WHERE "codAmount" = 0;
