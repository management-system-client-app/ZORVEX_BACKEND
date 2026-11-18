ALTER TABLE "CartItem" ADD COLUMN "supplierSize" TEXT;
ALTER TABLE "CartItem" ADD COLUMN "selectionKey" TEXT NOT NULL DEFAULT '';
DROP INDEX "CartItem_cartId_variantId_key";
CREATE UNIQUE INDEX "CartItem_cartId_variantId_selectionKey_key" ON "CartItem"("cartId", "variantId", "selectionKey");
