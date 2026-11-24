import { writeFile } from "node:fs/promises";
import { prisma } from "../src/app/config/prisma";
import { invalidateCache } from "../src/app/config/cache";
import { categoryType, matchStoreCategory } from "../src/modules/Mohasagor/mohasagor.category";

const run = async (): Promise<void> => {
  const apply = process.argv.includes("--apply");
  try {
    let categories = await prisma.category.findMany({ where: { isActive: true } });
    for (const spec of [
      { key: "cap", name: "Cap Item", parentKey: "mens", sortOrder: 35 },
      { key: "bra", name: "Bra", parentKey: "womens", sortOrder: 35 },
      { key: "hijab", name: "Hijab", parentKey: "womens", sortOrder: 40 },
      { key: "books", name: "Books", parentKey: null, sortOrder: 50 },
      { key: "mobilephone", name: "Mobile Phone", parentKey: null, sortOrder: 20 },
      { key: "eyewear", name: "Eyewear", parentKey: null, sortOrder: 60 },
      { key: "caraccessories", name: "Car Accessories", parentKey: null, sortOrder: 70 },
      { key: "tools", name: "Tools", parentKey: null, sortOrder: 80 },
      { key: "prayermat", name: "Prayer Mat", parentKey: "homelifestyle", sortOrder: 30 },
      { key: "raincoat", name: "Raincoat", parentKey: "winter", sortOrder: 90 },
      { key: "clock", name: "Clock", parentKey: null, sortOrder: 100 },
      { key: "stationery", name: "Stationery", parentKey: null, sortOrder: 110 },
      { key: "sportsfitness", name: "Sports & Fitness", parentKey: null, sortOrder: 120 },
      { key: "bicycleaccessories", name: "Bicycle Accessories", parentKey: null, sortOrder: 130 },
    ]) {
      const parent = spec.parentKey
        ? categories.find((category) => !category.parentId && categoryType(category.name) === spec.parentKey)
        : undefined;
      if (spec.parentKey && !parent) continue;
      if (categories.some((category) => category.parentId === (parent?.id ?? null) && categoryType(category.name) === spec.key)) continue;
      const slug = `${parent ? `${parent.slug}-` : ""}${spec.name.toLowerCase()}`;
      await prisma.category.upsert({
        where: { slug },
        create: { name: spec.name, slug, parentId: parent?.id ?? null, isActive: true, sortOrder: spec.sortOrder },
        update: { name: spec.name, parentId: parent?.id ?? null, isActive: true, sortOrder: spec.sortOrder },
      });
      categories = await prisma.category.findMany({ where: { isActive: true } });
    }
    const products = await prisma.product.findMany({
      where: { tags: { has: "Mohasagor" } },
      select: { id: true, name: true, description: true, categoryId: true, category: { select: { name: true } } },
    });
    const classified = products.flatMap((product) => {
      const destination = matchStoreCategory(categories, product.name);
      return destination ? [{ product, destination }] : [];
    });
    const changes = classified.flatMap(({ product, destination }) => destination.id !== product.categoryId
      ? [{ id: product.id, name: product.name, from: product.category.name, to: destination.name, categoryId: destination.id }]
      : []);
    const byCategory = Object.fromEntries(
      [...new Set(classified.map(({ destination }) => destination.name))].sort().map((name) => [
        name,
        classified.filter(({ destination }) => destination.name === name).length,
      ]),
    );
    const unmatched = products.filter((product) => !matchStoreCategory(categories, product.name));
    await writeFile("/tmp/mohasagor-unmatched-products.json", JSON.stringify(unmatched.map(({ id, name, category }) => ({ id, name, category: category.name })), null, 2));
    await writeFile("/tmp/mohasagor-reclassify-preview.json", JSON.stringify(changes.map(({ id: _id, categoryId: _categoryId, ...item }) => item), null, 2));

    console.info(JSON.stringify({
      mode: apply ? "apply" : "dry-run",
      taggedProducts: products.length,
      classifiedProducts: classified.length,
      productsToMove: changes.length,
      byCategory,
      unmatchedCount: unmatched.length,
      unmatchedExamples: unmatched.map(({ name, category }) => ({ name, currentCategory: category.name })),
      moveExamples: changes.slice(0, 20).map(({ id: _id, categoryId: _categoryId, ...item }) => item),
    }, null, 2));
    if (!apply || changes.length === 0) return;

    const sqlText = (value: string) => `'${value.replace(/'/g, "''")}'`;
    for (let offset = 0; offset < changes.length; offset += 250) {
      const batch = changes.slice(offset, offset + 250);
      const values = batch.map(({ id, categoryId }) => `(${sqlText(id)}, ${sqlText(categoryId)})`).join(",");
      await prisma.$executeRawUnsafe(
        `UPDATE "Product" AS product SET "categoryId" = incoming.category_id FROM (VALUES ${values}) AS incoming(id, category_id) WHERE product.id = incoming.id AND product."categoryId" IS DISTINCT FROM incoming.category_id`,
      );
    }
    await invalidateCache("products", "home", "catalog");
    console.info("Products assigned to their matching active categories; storefront caches invalidated.");
  } finally {
    await prisma.$disconnect();
  }
};

void run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Product category repair failed");
  process.exitCode = 1;
});
