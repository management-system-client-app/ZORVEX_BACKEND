import { prisma } from "../src/app/config/prisma";
import { invalidateCache } from "../src/app/config/cache";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  _count: { products: number; children: number; promotions: number; homeBlocks: number; sizeGuides: number };
};

const loadCategories = (): Promise<CategoryRow[]> => prisma.category.findMany({
  orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  select: {
    id: true,
    name: true,
    slug: true,
    parentId: true,
    _count: { select: { products: true, children: true, promotions: true, homeBlocks: true, sizeGuides: true } },
  },
});

const hasNoReferences = (category: CategoryRow): boolean =>
  category._count.products === 0 &&
  category._count.promotions === 0 &&
  category._count.homeBlocks === 0 &&
  category._count.sizeGuides === 0;

const run = async (): Promise<void> => {
  const apply = process.argv.includes("--apply");
  try {
    let categories = await loadCategories();
    const candidates: Array<{ id: string; name: string; slug: string }> = [];
    const removing = new Set<string>();
    while (true) {
      const leaves = categories.filter((category) =>
        !removing.has(category.id) &&
        hasNoReferences(category) &&
        !categories.some((child) => child.parentId === category.id && !removing.has(child.id)),
      );
      if (!leaves.length) break;
      candidates.push(...leaves.map(({ id, name, slug }) => ({ id, name, slug })));
      for (const category of leaves) removing.add(category.id);
    }
    console.info(JSON.stringify({ mode: apply ? "apply" : "dry-run", emptyCategoriesToRemove: candidates.length, categories: candidates.map(({ name, slug }) => ({ name, slug })) }, null, 2));
    if (apply && candidates.length) {
      for (const category of candidates) await prisma.category.delete({ where: { id: category.id } });
      await invalidateCache("catalog", "products", "home");
      console.info("Empty categories removed and storefront cache invalidated.");
    }
  } finally {
    await prisma.$disconnect();
  }
};

void run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Empty category cleanup failed");
  process.exitCode = 1;
});
