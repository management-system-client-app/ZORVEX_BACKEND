const NEW_PRODUCT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

type PricedProduct = {
  basePrice: { toString(): string } | number | string;
  compareAtPrice: { toString(): string } | number | string | null;
  createdAt: Date | string;
  description?: string;
};

const supplierSizesFromDescription = (description?: string): string[] => {
  const options = description?.match(/(?:^|\n)Supplier options:\s*([^\n]+)/i)?.[1];
  if (!options) return [];

  return [...new Set(options.split("|").flatMap((group) => {
    const separator = group.indexOf(":");
    if (separator < 0 || !/^(?:size|age)$/i.test(group.slice(0, separator).trim())) return [];
    return group.slice(separator + 1).split(",").map((value) => value.trim()).filter(Boolean);
  }))];
};

export const withProductFlags = <T extends PricedProduct>(product: T) => {
  const price = Number(product.basePrice);
  const compareAt = product.compareAtPrice == null ? null : Number(product.compareAtPrice);
  const createdAt = new Date(product.createdAt).getTime();

  return {
    ...product,
    onSale: compareAt != null && compareAt > price,
    isNew: Number.isFinite(createdAt) && Date.now() - createdAt < NEW_PRODUCT_WINDOW_MS,
    supplierSizes: supplierSizesFromDescription(product.description),
  };
};

/** Return a lightweight Cloudinary rendition for product-card thumbnails. */
export const productCardImageUrl = (url: string): string => {
  if (!url.includes("res.cloudinary.com/") || !url.includes("/image/upload/")) return url;

  const [prefix, assetPath] = url.split("/image/upload/");
  if (!prefix || !assetPath) return url;

  const segments = assetPath.split("/");
  // Stored Cloudinary URLs can already include a transformation before version.
  const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
  const asset = versionIndex >= 0 ? segments.slice(versionIndex).join("/") : segments.at(-1);
  return `${prefix}/image/upload/c_fill,w_480,h_600,q_auto:eco,f_auto/${asset}`;
};

export const withProductCardImages = <T extends { images: Array<{ url: string }> }>(product: T): T => ({
  ...product,
  images: product.images.map((image) => ({ ...image, url: productCardImageUrl(image.url) })),
}) as T;
