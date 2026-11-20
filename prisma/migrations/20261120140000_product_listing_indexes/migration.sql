CREATE INDEX "Product_status_createdAt_idx"
ON "Product"("status", "createdAt" DESC);

CREATE INDEX "Product_categoryId_status_createdAt_idx"
ON "Product"("categoryId", "status", "createdAt" DESC);
