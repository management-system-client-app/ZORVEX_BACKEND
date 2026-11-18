import { randomUUID } from "node:crypto";
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../app/config/prisma";
import { invalidateCache } from "../../app/config/cache";
import { AppError } from "../../app/errors/AppError";
import { classifyMohasagorCategory, matchStoreCategory } from "./mohasagor.category";
import { mohasagorService } from "./mohasagor.service";

type SupplierImage = { product_image?: unknown };
type SupplierProduct = {
  id?: unknown;
  name?: unknown;
  details?: unknown;
  product_code?: unknown;
  product_image?: SupplierImage[];
  thumbnail_img?: unknown;
  reselling_price?: unknown;
  sell_price?: unknown;
  sale_price?: unknown;
  price?: unknown;
  stock?: unknown;
  stock_status?: unknown;
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

const parseStock = (product: SupplierProduct): number => {
  const stock = Number(product.stock);
  return Number.isFinite(stock) && stock > 0 ? Math.floor(stock) : 0;
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
    ...(Array.isArray(product.product_image)
      ? product.product_image.map((image) => image?.product_image)
      : []),
    product.thumbnail_img,
  ];
  const urls = [...new Set(paths.filter((path): path is string => typeof path === "string" && path.length > 0)
    .map((path) => {
      try {
        return new URL(path, "https://mohasagor.com.bd/").toString();
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
  brandId: string,
) => {
  const rows = supplierProducts.flatMap((rawProduct) => {
    if (typeof rawProduct !== "object" || rawProduct === null) return [];
    const product = rawProduct as SupplierProduct;
    const supplierId = String(product.id ?? "").trim();
    const name = typeof product.name === "string" ? postgresSafeText(product.name).slice(0, 160) : "";
    if (!supplierId || !name) return [];

    const descriptionText = `${name} ${typeof product.details === "string" ? product.details : ""}`;
    const category = matchStoreCategory(categories, descriptionText);
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
        stock,
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
        stock,
      },
      supplierOptions: options,
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

        const stockRows = rowsToInsert.map((row) => ({
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
      stockSynced: uniqueRows.length,
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
  // Check database and category mapping before making any rate-limited supplier requests.
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  if (categories.length === 0) {
    throw new AppError("Create active store categories before importing Mohasagor products", 422);
  }

  const categoryTypes = new Set(categories.map((category) => classifyMohasagorCategory(category.name)).filter(Boolean));
  if (categoryTypes.size === 0) {
    throw new AppError("No active store categories match the Mohasagor product catalog", 422);
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
    const pageResult = await importOnePage(products, categories, brand.id);
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
    const pageResult = await importOnePage(result.products, categories, brand.id);
    imported += pageResult.imported;
    stockSynced += pageResult.stockSynced;
    skipped += pageResult.skipped;
    onProgress?.({ page, pages: totalPages, imported, stockSynced, skipped });
  }

  await invalidateCache("products", "home");
  return { imported, stockSynced, skipped, pages: totalPages };
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

export const mohasagorImportService = { importAllProducts, syncExistingProductPrices };
