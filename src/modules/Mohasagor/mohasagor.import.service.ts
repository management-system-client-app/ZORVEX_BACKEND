import { randomUUID } from "node:crypto";
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../app/config/prisma";
import { invalidateCache } from "../../app/config/cache";
import { AppError } from "../../app/errors/AppError";
import { categoryType, isBookCategory, isBookProductName, isOtherCategory, matchStoreCategory } from "./mohasagor.category";
import { mohasagorService } from "./mohasagor.service";

type SupplierImage = { product_image?: unknown };
type SupplierProduct = {
  id?: unknown;
  name?: unknown;
  category?: unknown;
  details?: unknown;
  product_code?: unknown;
  product_image?: SupplierImage[];
  product_images?: SupplierImage[];
  thumbnail_img?: unknown;
  reselling_price?: unknown;
  sell_price?: unknown;
  sale_price?: unknown;
  price?: unknown;
  status?: unknown;
  stock?: unknown;
  stock_quantity?: unknown;
  available_stock?: unknown;
  available_quantity?: unknown;
  quantity?: unknown;
  qty?: unknown;
  stock_status?: unknown;
  is_available?: unknown;
  available?: unknown;
  product_variants?: unknown;
};

type SupplierOption = { attribute?: unknown; variant?: unknown };

const postgresSafeText = (value: string): string => value
  .replace(/[\u0000-\u001f\u007f]/g, " ")
  .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "")
  .replace(/\s+/g, " ")
  .trim();

const parsePrice = (product: SupplierProduct): number | undefined => {
  for (const value of [product.price, product.sell_price, product.sale_price, product.reselling_price]) {
    const amount = Number(value);
    if (Number.isFinite(amount) && amount > 0) return Math.round(amount * 100) / 100;
  }
  return undefined;
};

const parseStockQuantity = (value: unknown): number | undefined => {
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  if (typeof value === "string" && !value.trim()) return undefined;
  const stock = Number(typeof value === "string" ? value.replace(/,/g, "") : value);
  return Number.isFinite(stock) && stock >= 0 ? Math.floor(stock) : undefined;
};

const parseAvailability = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return undefined;
  }
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (["available", "instock", "stock", "yes", "true", "active", "enabled", "published", "1"].includes(normalized)) return true;
  if (["unavailable", "outofstock", "soldout", "nostock", "no", "false", "inactive", "disabled", "unpublished", "0"].includes(normalized)) return false;
  return undefined;
};

const parseStock = (product: SupplierProduct): number | undefined => {
  for (const value of [product.stock_status, product.is_available, product.available]) {
    const available = parseAvailability(value);
    if (available !== undefined) return available ? 20 : 0;
  }

  const productStatusAvailability = parseAvailability(product.status);
  if (productStatusAvailability !== undefined) return productStatusAvailability ? 20 : 0;

  for (const value of [
    product.stock,
    product.stock_quantity,
    product.available_stock,
    product.available_quantity,
    product.quantity,
    product.qty,
  ]) {
    const stock = parseStockQuantity(value);
    if (stock !== undefined) return stock > 0 ? 20 : 0;
  }

  if (!Array.isArray(product.product_variants)) return undefined;
  const variants = product.product_variants.filter((value): value is Record<string, unknown> =>
    typeof value === "object" && value !== null,
  );
  const variantStocks = variants.flatMap((variant) => {
    for (const field of ["stock", "stock_quantity", "available_stock", "available_quantity", "quantity", "qty"]) {
      const stock = parseStockQuantity(variant[field]);
      if (stock !== undefined) return [stock > 0 ? 20 : 0];
    }
    return [];
  });

  if (variantStocks.some((stock) => stock > 0)) return 20;
  if (variantStocks.length > 0) return 0;

  const variantAvailability = variants.map((variant) =>
    parseAvailability(variant.stock_status ?? variant.is_available ?? variant.available),
  );
  if (variantAvailability.some((available) => available === true)) return 20;
  if (variantAvailability.length > 0 && variantAvailability.every((available) => available === false)) return 0;
  return undefined;
};

const supplierOptions = (value: unknown): string => {
  if (!Array.isArray(value)) return "";

  const groups = new Map<string, string[]>();
  for (const rawOption of value) {
    if (typeof rawOption !== "object" || rawOption === null) continue;
    const option = rawOption as SupplierOption;
    const attribute = typeof option.attribute === "string" ? postgresSafeText(option.attribute) : "";
    const variant = typeof option.variant === "string" ? postgresSafeText(option.variant) : "";
    if (!variant) continue;
    const groupName = attribute || "Option";
    const values = groups.get(groupName) ?? [];
    if (!values.includes(variant)) values.push(variant);
    groups.set(groupName, values);
  }

  return [...groups.entries()]
    .map(([attribute, values]) => `${attribute}: ${values.join(", ")}`)
    .join(" | ")
    .slice(0, 1_500);
};

const cleanDescription = (value: unknown, productName: string): string => {
  const description = typeof value === "string"
    ? value
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(?:li|p|div|h[1-6])>/gi, "\n")
        .replace(/<[^>]*>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim()
    : "";

  return postgresSafeText(description || `Product supplied by Mohasagor: ${productName}`).slice(0, 5_000);
};

const imageUrls = (product: SupplierProduct, productName: string) => {
  const paths = [
    ...(Array.isArray(product.product_images)
      ? product.product_images.map((image) => image?.product_image)
      : []),
    ...(Array.isArray(product.product_image)
      ? product.product_image.map((image) => image?.product_image)
      : []),
    product.thumbnail_img,
  ];
  const urls = [...new Set(paths.filter((path): path is string => typeof path === "string" && path.length > 0)
    .map((path) => {
      try {
        return new URL(path, "https://mohasagor.com/").toString();
      } catch {
        return undefined;
      }
    })
    .filter((url): url is string => Boolean(url)))];

  return urls.map((url, index) => ({
    url: postgresSafeText(url),
    alt: postgresSafeText(productName),
    sortOrder: index,
    isPrimary: index === 0,
  }));
};

const supplierCategorySlug = (name: string): string => {
  const slug = name
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150);
  return `mohasagor-${slug || Buffer.from(name).toString("hex").slice(0, 32)}`;
};

const ensureSupplierCategories = async (products: unknown[]) => {
  const names = [...new Map(products.flatMap((rawProduct) => {
    if (typeof rawProduct !== "object" || rawProduct === null) return [];
    const value = (rawProduct as SupplierProduct).category;
    const name = typeof value === "string" ? postgresSafeText(value) : "";
    return name ? [[name.toLocaleLowerCase(), name] as const] : [];
  })).values()];

  const categories = await Promise.all(names.map((name) => {
    return prisma.category.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }],
    }).then(async (existing) => {
      if (existing) {
        return prisma.category.update({ where: { id: existing.id }, data: { isActive: true } });
      }
      const slug = supplierCategorySlug(name);
      return prisma.category.upsert({
        where: { slug },
        create: {
          name,
          slug,
          description: "Mohasagor supplier category",
          isActive: true,
          sortOrder: 500,
        },
        update: { name, isActive: true },
      });
    });
  }));
  return new Map(categories.map((category) => [category.name.trim().toLocaleLowerCase(), category]));
};

const ensureApparelSubcategories = async (
  categories: Awaited<ReturnType<typeof prisma.category.findMany>>,
) => {
  const specs = [
    { parentKey: "mens", name: "T-shirt", key: "tshirt", sortOrder: 10 },
    { parentKey: null, name: "Bra", key: "bra", sortOrder: 10 },
    { parentKey: null, name: "Saree", key: "saree", sortOrder: 20 },
    { parentKey: null, name: "Hoodie", key: "hoodie", sortOrder: 30 },
    { parentKey: "womens", name: "Hijab", key: "hijab", sortOrder: 40 },
    { parentKey: null, name: "Books", key: "books", sortOrder: 50 },
    { parentKey: null, name: "Mobile Phone", key: "mobilephone", sortOrder: 20 },
    { parentKey: null, name: "Eyewear", key: "eyewear", sortOrder: 60 },
    { parentKey: null, name: "Car Accessories", key: "caraccessories", sortOrder: 70 },
    { parentKey: null, name: "Tools", key: "tools", sortOrder: 80 },
    { parentKey: "homelifestyle", name: "Prayer Mat", key: "prayermat", sortOrder: 30 },
    { parentKey: "winter", name: "Raincoat", key: "raincoat", sortOrder: 90 },
    { parentKey: null, name: "Clock", key: "clock", sortOrder: 100 },
    { parentKey: null, name: "Stationery", key: "stationery", sortOrder: 110 },
    { parentKey: null, name: "Sports & Fitness", key: "sportsfitness", sortOrder: 120 },
    { parentKey: null, name: "Bicycle Accessories", key: "bicycleaccessories", sortOrder: 130 },
  ];
  const additions = [];

  for (const spec of specs) {
    const parent = spec.parentKey
      ? categories.find((category) => !category.parentId && categoryType(category.name) === spec.parentKey)
      : undefined;
    if (spec.parentKey && !parent) continue;
    if (categories.some((category) => category.parentId === (parent?.id ?? null) && categoryType(category.name) === spec.key)) continue;

    const slug = `${parent ? `${parent.slug}-` : ""}${spec.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`.slice(0, 180);
    const category = await prisma.category.upsert({
      where: { slug },
      create: {
        name: spec.name,
        slug,
        parentId: parent?.id ?? null,
        description: `Mohasagor ${spec.name} category`,
        isActive: true,
        sortOrder: spec.sortOrder,
      },
      update: { name: spec.name, parentId: parent?.id ?? null, isActive: true, sortOrder: spec.sortOrder },
    });
    additions.push(category);
  }

  return [...categories, ...additions];
};

const inferGender = (text: string): "MEN" | "WOMEN" | "KIDS" | "UNISEX" => {
  if (/\b(?:kids?|children|baby)\b|শিশু|বেবি/i.test(text)) return "KIDS";
  if (/\b(?:women|woman|ladies|girls?)\b|মহিলা|নারী/i.test(text)) return "WOMEN";
  if (/\b(?:men|man|gents|boys?)\b|পুরুষ/i.test(text)) return "MEN";
  return "UNISEX";
};

const delay = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const isInvalidJsonInput = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const meta = "meta" in error ? JSON.stringify((error as { meta?: unknown }).meta) : "";
  return /22P02|invalid input syntax for type json/i.test(`${error.message} ${meta}`);
};

const getProductsWithRetry = async (page: number) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await mohasagorService.getProducts(page);
    } catch (error) {
      const isRateLimit = error instanceof AppError && error.message.includes("status 429");
      if (!isRateLimit || attempt === 2) throw error;

      const details = error.details;
      const retryAfterSeconds =
        typeof details === "object" && details !== null && "retryAfterSeconds" in details
          ? Number((details as { retryAfterSeconds?: unknown }).retryAfterSeconds)
          : 60;
      await delay((Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds : 60) * 1_000 + 1_000);
    }
  }

  throw new AppError("Mohasagor API retry limit exceeded", 502);
};

const importOnePage = async (
  supplierProducts: unknown[],
  categories: Awaited<ReturnType<typeof prisma.category.findMany>>,
  supplierCategories: Map<string, Awaited<ReturnType<typeof prisma.category.upsert>>>,
  brandId: string,
) => {
  const rows = supplierProducts.flatMap((rawProduct) => {
    if (typeof rawProduct !== "object" || rawProduct === null) return [];
    const product = rawProduct as SupplierProduct;
    const supplierId = String(product.id ?? "").trim();
    const name = typeof product.name === "string" ? postgresSafeText(product.name).slice(0, 160) : "";
    if (!supplierId || !name) return [];

    const descriptionText = `${name} ${typeof product.details === "string" ? product.details : ""}`;
    const supplierCategoryName = typeof product.category === "string" ? postgresSafeText(product.category) : "";
    const categoryCandidates = [
      matchStoreCategory(categories, name),
      matchStoreCategory(categories, descriptionText),
      supplierCategories.get(supplierCategoryName.toLocaleLowerCase()),
    ].flatMap((candidate) => candidate ? [candidate] : []);
    const bookCategory = categoryCandidates.find((candidate) => isBookCategory(candidate.name));
    const otherCategory = categories.find((candidate) => isOtherCategory(candidate.name));
    const category = isBookProductName(name)
      ? bookCategory ?? otherCategory
      : categoryCandidates.find((candidate) => !isBookCategory(candidate.name))
        ?? otherCategory;
    const basePrice = parsePrice(product);
    if (!category || !basePrice) return [];

    const safeId = supplierId.toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 120);
    if (!safeId) return [];

    const images = imageUrls(product, name);
    const baseDescription = cleanDescription(product.details, name);
    const options = supplierOptions(product.product_variants);
    const description = postgresSafeText(
      options ? `${baseDescription}\n\nSupplier options: ${options}` : baseDescription,
    ).slice(0, 5_000);
    const safeSupplierId = postgresSafeText(supplierId);
    const supplierCode = postgresSafeText(String(product.product_code ?? supplierId)).slice(0, 40);
    const slug = `mohasagor-${safeId}`.slice(0, 180);
    const tags = ["Mohasagor", `supplier-id:${safeSupplierId}`, `supplier-code:${supplierCode}`];
    const stock = parseStock(product);

    return [{
      where: { slug },
      create: {
        name,
        slug,
        description,
        status: "ACTIVE" as const,
        gender: inferGender(descriptionText),
        basePrice,
        brandId,
        categoryId: category.id,
        tags,
        images: { create: images },
        stock: stock ?? 0,
      },
      update: {
        name,
        description,
        status: "ACTIVE" as const,
        gender: inferGender(descriptionText),
        basePrice,
        brandId,
        categoryId: category.id,
        tags,
        images: { deleteMany: {}, create: images },
        stock: stock ?? 0,
      },
      supplierOptions: options,
      stockKnown: stock !== undefined,
    }];
  });
  const uniqueRows = [...new Map(rows.map((row) => [row.where.slug, row])).values()];

  if (uniqueRows.length > 0) {
    const insertRows = async (rowsToInsert: typeof uniqueRows) => {
      const productJson = JSON.stringify(rowsToInsert.map((row) => ({
        id: randomUUID(),
        name: row.create.name,
        slug: row.create.slug,
        description: row.create.description,
        gender: row.create.gender,
        basePrice: row.create.basePrice,
        brandId: row.create.brandId,
        categoryId: row.create.categoryId,
        tags: row.create.tags,
        stock: row.create.stock,
      })));

      const priceJson = JSON.stringify(rowsToInsert.map((row) => ({
        slug: row.where.slug,
        basePrice: row.create.basePrice,
      })));

      return prisma.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          WITH incoming AS (
            SELECT * FROM jsonb_to_recordset(${priceJson}::jsonb) AS item(
              slug text, "basePrice" numeric
            )
          )
          UPDATE "Product" AS product
          SET "basePrice" = incoming."basePrice", "updatedAt" = NOW()
          FROM incoming
          WHERE product.slug = incoming.slug
            AND product.slug LIKE 'mohasagor-%'
        `);

        const inserted = await tx.$queryRaw<{ id: string; slug: string }[]>(Prisma.sql`
          WITH incoming AS (
            SELECT * FROM jsonb_to_recordset(${productJson}::jsonb) AS item(
              id text, name text, slug text, description text, gender text,
            "basePrice" numeric, "brandId" text, "categoryId" text, tags jsonb, stock integer
            )
          )
          INSERT INTO "Product" (
            id, name, slug, description, status, gender, "basePrice", "commissionPerUnit",
            "brandId", "categoryId", tags, "publishedAt", "createdAt", "updatedAt"
          )
          SELECT
            id, name, slug, description, 'ACTIVE'::"ProductStatus", gender::"Gender",
            "basePrice", 0, "brandId", "categoryId",
            ARRAY(SELECT jsonb_array_elements_text(tags)), NOW(), NOW(), NOW()
          FROM incoming
          ON CONFLICT (slug) DO NOTHING
          RETURNING id, slug
        `);

        const insertedSlugs = new Set(inserted.map((row) => row.slug));
        const imageRows = rowsToInsert
          .filter((row) => insertedSlugs.has(row.where.slug))
          .flatMap((row) => row.create.images.create.map((image) => ({
            id: randomUUID(),
            slug: row.where.slug,
            url: image.url,
            alt: image.alt,
            sortOrder: image.sortOrder,
            isPrimary: image.isPrimary,
          })));

        if (imageRows.length > 0) {
          const imageJson = JSON.stringify(imageRows);
          await tx.$executeRaw(Prisma.sql`
            WITH incoming AS (
              SELECT * FROM jsonb_to_recordset(${imageJson}::jsonb) AS image(
                id text, slug text, url text, alt text, "sortOrder" integer, "isPrimary" boolean
              )
            )
            INSERT INTO "ProductImage" (
              id, "productId", url, alt, "sortOrder", "isPrimary", "createdAt"
            )
            SELECT incoming.id, product.id, incoming.url, incoming.alt,
              incoming."sortOrder", incoming."isPrimary", NOW()
            FROM incoming
            JOIN "Product" AS product ON product.slug = incoming.slug
          `);
        }

        const stockRows = rowsToInsert.filter((row) => row.stockKnown).map((row) => ({
          id: randomUUID(),
          slug: row.where.slug,
          sku: `MOHASAGOR-${row.where.slug.slice("mohasagor-".length)}-STOCK`,
          stock: row.create.stock,
        }));
        const stockJson = JSON.stringify(stockRows);
        await tx.$executeRaw(Prisma.sql`
          WITH incoming AS (
            SELECT * FROM jsonb_to_recordset(${stockJson}::jsonb) AS item(
              id text, slug text, sku text, stock integer
            )
          )
          INSERT INTO "ProductVariant" (
            id, "productId", sku, "optionLabel", stock, "createdAt", "updatedAt"
          )
          SELECT incoming.id, product.id, incoming.sku, 'Mohasagor supplier stock', incoming.stock, NOW(), NOW()
          FROM incoming
          JOIN "Product" AS product ON product.slug = incoming.slug
          ON CONFLICT (sku) DO UPDATE SET
            stock = EXCLUDED.stock,
            "optionLabel" = EXCLUDED."optionLabel",
            "isActive" = TRUE,
            "updatedAt" = NOW()
          WHERE "ProductVariant"."productId" = EXCLUDED."productId"
        `);

        const descriptions = rowsToInsert
          .filter((row) => row.supplierOptions.length > 0)
          .map((row) => ({ slug: row.where.slug, options: row.supplierOptions }));
        if (descriptions.length > 0) {
          const descriptionJson = JSON.stringify(descriptions);
          await tx.$executeRaw(Prisma.sql`
            WITH incoming AS (
              SELECT * FROM jsonb_to_recordset(${descriptionJson}::jsonb) AS item(
                slug text, options text
              )
            )
            UPDATE "Product" AS product
            SET description = LEFT(
              product.description || CHR(10) || CHR(10) || 'Supplier options: ' || incoming.options,
              5000
            ), "updatedAt" = NOW()
            FROM incoming
            WHERE product.slug = incoming.slug
              AND product.description NOT LIKE '%Supplier options:%'
          `);
        }

        return inserted;
      }, { maxWait: 10_000, timeout: 20_000 });
    };

    let insertedRows: { id: string; slug: string }[];
    try {
      insertedRows = await insertRows(uniqueRows);
    } catch (error) {
      if (!isInvalidJsonInput(error)) throw error;
      // A single malformed supplier title/details must not block the rest of the page.
      insertedRows = [];
      for (const row of uniqueRows) {
        try {
          insertedRows.push(...await insertRows([row]));
        } catch (rowError) {
          if (!isInvalidJsonInput(rowError)) throw rowError;
        }
      }
    }

    return {
      imported: insertedRows.length,
      stockSynced: uniqueRows.filter((row) => row.stockKnown).length,
      skipped: supplierProducts.length - uniqueRows.length,
    };
  }

  return { imported: 0, stockSynced: 0, skipped: supplierProducts.length };
};

const importAllProducts = async (
  startPage = 1,
  onProgress?: (progress: { page: number; pages: number; imported: number; stockSynced: number; skipped: number }) => void,
): Promise<{ imported: number; stockSynced: number; skipped: number; pages: number }> => {
  if (!Number.isInteger(startPage) || startPage < 1) {
    throw AppError.badRequest("Import start page must be a positive integer");
  }
  const existingBrand = await prisma.brand.findFirst({
    where: { OR: [{ slug: "mohasagor" }, { name: { equals: "Mohasagor", mode: "insensitive" } }] },
    select: { id: true },
  });
  const brand = existingBrand ?? await prisma.brand.create({
    data: { name: "Mohasagor", slug: "mohasagor", isActive: true },
    select: { id: true },
  });

  let imported = 0;
  let stockSynced = 0;
  let skipped = 0;
  let totalPages: number;
  const firstPage = await getProductsWithRetry(startPage);
  totalPages = firstPage.meta.totalPages;

  const processPage = async (page: number, products: unknown[]) => {
    const supplierCategories = await ensureSupplierCategories(products);
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    const apparelCategories = await ensureApparelSubcategories(categories);
    const pageResult = await importOnePage(products, apparelCategories, supplierCategories, brand.id);
    imported += pageResult.imported;
    stockSynced += pageResult.stockSynced;
    skipped += pageResult.skipped;
    onProgress?.({ page, pages: totalPages, imported, stockSynced, skipped });
  };

  await processPage(startPage, firstPage.products);

  for (let page = startPage + 1; page <= totalPages; page += 1) {
    // The provider limits this key to five requests per minute.
    await delay(13_000);
    const result = await getProductsWithRetry(page);
    const supplierCategories = await ensureSupplierCategories(result.products);
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    const apparelCategories = await ensureApparelSubcategories(categories);
    const pageResult = await importOnePage(result.products, apparelCategories, supplierCategories, brand.id);
    imported += pageResult.imported;
    stockSynced += pageResult.stockSynced;
    skipped += pageResult.skipped;
    onProgress?.({ page, pages: totalPages, imported, stockSynced, skipped });
  }

  await invalidateCache("catalog", "products", "home");
  return { imported, stockSynced, skipped, pages: totalPages };
};

const syncExistingProductCategories = async (
  onProgress?: (progress: { page: number; pages: number; updated: number }) => void,
): Promise<{ updated: number; pages: number }> => {
  const firstPage = await getProductsWithRetry(1);
  let updated = 0;

  const syncPage = async (supplierProducts: unknown[]) => {
    const supplierCategories = await ensureSupplierCategories(supplierProducts);
    const rows = supplierProducts.flatMap((rawProduct) => {
      if (typeof rawProduct !== "object" || rawProduct === null) return [];
      const product = rawProduct as SupplierProduct;
      const supplierId = String(product.id ?? "").trim();
      const categoryName = typeof product.category === "string" ? postgresSafeText(product.category) : "";
      const category = supplierCategories.get(categoryName.toLocaleLowerCase());
      const safeId = supplierId.toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 120);
      if (!safeId || !category) return [];
      return [{ slug: `mohasagor-${safeId}`.slice(0, 180), category_id: category.id }];
    });

    if (rows.length === 0) return;
    updated += await prisma.$executeRaw(Prisma.sql`
      WITH incoming AS (
        SELECT * FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS item(
          slug text, category_id text
        )
      )
      UPDATE "Product" AS product
      SET "categoryId" = incoming.category_id
      FROM incoming
      WHERE product.slug = incoming.slug
        AND product.tags @> ARRAY['Mohasagor']::text[]
        AND product."categoryId" IS DISTINCT FROM incoming.category_id
    `);
  };

  await syncPage(firstPage.products);
  onProgress?.({ page: 1, pages: firstPage.meta.totalPages, updated });
  for (let page = 2; page <= firstPage.meta.totalPages; page += 1) {
    await delay(13_000);
    const result = await getProductsWithRetry(page);
    await syncPage(result.products);
    onProgress?.({ page, pages: firstPage.meta.totalPages, updated });
  }

  await invalidateCache("products", "home", "catalog");
  return { updated, pages: firstPage.meta.totalPages };
};

const syncExistingProductPrices = async (
  onProgress?: (progress: { page: number; pages: number; updated: number }) => void,
): Promise<{ updated: number; pages: number }> => {
  let updated = 0;
  const firstPage = await getProductsWithRetry(1);

  const syncPage = async (supplierProducts: unknown[]) => {
    const rows = supplierProducts.flatMap((rawProduct) => {
      if (typeof rawProduct !== "object" || rawProduct === null) return [];
      const product = rawProduct as SupplierProduct;
      const supplierId = String(product.id ?? "").trim();
      const price = parsePrice(product);
      const safeId = supplierId.toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 120);
      if (!safeId || price == null) return [];
      return [{ slug: `mohasagor-${safeId}`.slice(0, 180), basePrice: price }];
    });

    if (rows.length === 0) return;
    const priceJson = JSON.stringify(rows);
    updated += await prisma.$executeRaw(Prisma.sql`
      WITH incoming AS (
        SELECT * FROM jsonb_to_recordset(${priceJson}::jsonb) AS item(
          slug text, "basePrice" numeric
        )
      )
      UPDATE "Product" AS product
      SET "basePrice" = incoming."basePrice", "updatedAt" = NOW()
      FROM incoming
      WHERE product.slug = incoming.slug
        AND product.tags @> ARRAY['Mohasagor']::text[]
    `);
  };

  await syncPage(firstPage.products);
  onProgress?.({ page: 1, pages: firstPage.meta.totalPages, updated });
  for (let page = 2; page <= firstPage.meta.totalPages; page += 1) {
    await delay(13_000);
    const result = await getProductsWithRetry(page);
    await syncPage(result.products);
    onProgress?.({ page, pages: firstPage.meta.totalPages, updated });
  }

  await invalidateCache("products", "home");
  return { updated, pages: firstPage.meta.totalPages };
};

const syncExistingProductStock = async (
  onProgress?: (progress: { page: number; pages: number; updated: number }) => void,
) => {
  const firstPage = await getProductsWithRetry(1);
  let updated = 0;

  const syncPage = async (supplierProducts: unknown[]) => {
    const rows = supplierProducts.flatMap((rawProduct) => {
      if (typeof rawProduct !== "object" || rawProduct === null) return [];
      const product = rawProduct as SupplierProduct;
      const supplierId = String(product.id ?? "").trim();
      const stock = parseStock(product);
      const safeId = supplierId.toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 120);
      if (!safeId || stock === undefined) return [];
      const slug = `mohasagor-${safeId}`.slice(0, 180);
      return [{ slug, sku: `MOHASAGOR-${slug.slice("mohasagor-".length)}-STOCK`, stock }];
    });

    if (rows.length === 0) return;
    updated += await prisma.$executeRaw(Prisma.sql`
      WITH incoming AS (
        SELECT * FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS item(
          slug text, sku text, stock integer
        )
      )
      UPDATE "ProductVariant" AS variant
      SET stock = incoming.stock, "updatedAt" = NOW()
      FROM incoming
      INNER JOIN "Product" AS product
        ON product.slug = incoming.slug
        AND product.tags @> ARRAY['Mohasagor']::text[]
      WHERE variant."productId" = product.id
        AND variant.sku = incoming.sku
    `);
  };

  await syncPage(firstPage.products);
  onProgress?.({ page: 1, pages: firstPage.meta.totalPages, updated });
  for (let page = 2; page <= firstPage.meta.totalPages; page += 1) {
    await delay(13_000);
    const result = await getProductsWithRetry(page);
    await syncPage(result.products);
    onProgress?.({ page, pages: firstPage.meta.totalPages, updated });
  }

  await invalidateCache("products", "home", "catalog");
  return { updated, pages: firstPage.meta.totalPages };
};

export const mohasagorImportService = {
  importAllProducts,
  syncExistingProductCategories,
  syncExistingProductPrices,
  syncExistingProductStock,
};
