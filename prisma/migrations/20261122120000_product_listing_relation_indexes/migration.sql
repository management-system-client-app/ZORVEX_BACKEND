CREATE INDEX "ProductImage_productId_isPrimary_sortOrder_idx"
ON "ProductImage"("productId", "isPrimary" DESC, "sortOrder");

CREATE INDEX "ProductVariant_productId_isActive_idx"
ON "ProductVariant"("productId", "isActive");
