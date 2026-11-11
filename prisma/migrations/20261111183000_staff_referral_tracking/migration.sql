ALTER TABLE "Admin"
  ADD COLUMN "whatsappNumber" TEXT;

ALTER TABLE "Order"
  ADD COLUMN "referredByStaffId" TEXT,
  ADD COLUMN "staffCommissionPaidAt" TIMESTAMP(3);

ALTER TABLE "Product"
  ADD COLUMN "commissionPerUnit" DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE "OrderItem"
  ADD COLUMN "commissionPerUnit" DECIMAL(10,2) NOT NULL DEFAULT 0;

CREATE INDEX "Order_referredByStaffId_idx"
  ON "Order"("referredByStaffId");

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_referredByStaffId_fkey"
  FOREIGN KEY ("referredByStaffId") REFERENCES "Admin"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
