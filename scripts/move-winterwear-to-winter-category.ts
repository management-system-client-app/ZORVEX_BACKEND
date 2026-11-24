import { prisma } from "../src/app/config/prisma";
import { invalidateCache } from "../src/app/config/cache";

const run = async (): Promise<void> => {
  const apply = process.argv.includes("--apply");
  try {
    const categories = await prisma.category.findMany({ where: { isActive: true } });
    const winterRoot = categories.find((category) => !category.parentId && category.name.toLowerCase() === "winter");
    const nestedWinter = categories.find((category) => category.name.toLowerCase() === "winter" && category.parentId);
    if (!winterRoot || !nestedWinter) throw new Error("Both root and nested Winter categories are required");

    const products = await prisma.product.findMany({
      where: { categoryId: nestedWinter.id },
      select: { id: true, name: true },
    });
    console.info(JSON.stringify({
      mode: apply ? "apply" : "dry-run",
      from: nestedWinter.name,
      to: winterRoot.name,
      productsToMove: products.length,
      examples: products.slice(0, 12).map(({ name }) => name),
    }, null, 2));

    if (!apply || products.length === 0) return;
    const result = await prisma.product.updateMany({
      where: { categoryId: nestedWinter.id },
      data: { categoryId: winterRoot.id },
    });
    await invalidateCache("products", "home", "catalog");
    console.info(`Moved ${result.count} seasonal products into the top-level Winter category and invalidated storefront cache.`);
  } finally {
    await prisma.$disconnect();
  }
};

void run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Winter category repair failed");
  process.exitCode = 1;
});
