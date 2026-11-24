import { prisma } from "../src/app/config/prisma";
import { invalidateCache } from "../src/app/config/cache";
import { matchStoreCategory } from "../src/modules/Mohasagor/mohasagor.category";

const run = async (): Promise<void> => {
  const apply = process.argv.includes("--apply");
  try {
    const categories = await prisma.category.findMany({ where: { isActive: true } });
    const winterCombo = categories.find((category) => category.name === "Winter combo");
    if (!winterCombo) throw new Error("Winter combo category not found");

    const products = await prisma.product.findMany({
      where: { categoryId: winterCombo.id },
      select: { id: true, name: true, categoryId: true },
    });
    const moves = products.map((product) => ({
      product,
      destination: matchStoreCategory(categories, product.name),
    }));
    const unmatched = moves.filter((move) => !move.destination);
    if (unmatched.length) {
      console.error(JSON.stringify({ unmatched: unmatched.map(({ product }) => product.name) }, null, 2));
      throw new Error("Some Winter combo products need a specific category rule before apply");
    }
    const changed = moves.filter(({ product, destination }) => destination && product.categoryId !== destination.id);
    console.info(JSON.stringify({
      mode: apply ? "apply" : "dry-run",
      productsInWinterCombo: products.length,
      productsToMove: changed.length,
      moves: changed.map(({ product, destination }) => ({ name: product.name, to: destination?.name })),
    }, null, 2));

    if (!apply || !changed.length) return;
    await prisma.$transaction(changed.map(({ product, destination }) => prisma.product.update({
      where: { id: product.id },
      data: { categoryId: destination!.id },
    })));
    await invalidateCache("products", "home", "catalog");
    console.info("Winter combo cleared and storefront cache invalidated.");
  } finally {
    await prisma.$disconnect();
  }
};

void run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Winter category repair failed");
  process.exitCode = 1;
});
