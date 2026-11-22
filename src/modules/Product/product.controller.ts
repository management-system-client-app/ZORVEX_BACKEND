import type { Response } from "express";
import { AppError } from "../../app/errors/AppError";
import { deleteCloudinaryImages, uploadImageBuffer } from "../../app/config/cloudinary";
import type { ValidatedRequest } from "../../app/middlewares/validateRequest";
import { productService } from "./product.service";
import type {
  CreateProductInput,
  ProductIdParam,
  ProductImageParam,
  ProductListQuery,
  ProductSuggestionQuery,
  UpdateProductInput,
} from "./product.validation";

const createProduct = async (
  req: ValidatedRequest<CreateProductInput>,
  res: Response,
): Promise<void> => {
  if (
    req.validatedBody.commissionPerUnit !== undefined &&
    req.auth?.adminRole !== "SUPER_ADMIN"
  ) {
    throw AppError.forbidden("Only the store owner can set staff commission rates");
  }

  const files = Array.isArray(req.files) ? req.files : [];
  const uploaded =
    files.length === 0
      ? []
      : await Promise.all(
          files.map((file) => uploadImageBuffer(file.buffer, "ecommerce/products", file.mimetype, file.originalname)),
        );

  try {
    const product = await productService.createProduct(
      req.validatedBody,
      uploaded.map((image) => ({
        url: image.url,
        alt: req.validatedBody.name,
      })),
    );

    res.status(201).json({
      success: true,
      message: "Product created",
      data: product,
    });
  } catch (error) {
    await deleteCloudinaryImages(uploaded.map((image) => image.publicId));
    throw error;
  }
};

const getAllProducts = async (
  req: ValidatedRequest<unknown, Record<string, string>, ProductListQuery>,
  res: Response,
): Promise<void> => {
  // This endpoint is public and varies only by its query string. Let the CDN
  // serve repeated catalog requests without waking a serverless function.
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=15, stale-while-revalidate=30");
  const result = await productService.getAllProducts(req.validatedQuery);

  res.status(200).json({
    success: true,
    message: "Products fetched",
    data: result.items,
    meta: result.meta,
  });
};

const getProductSuggestions = async (
  req: ValidatedRequest<unknown, Record<string, string>, ProductSuggestionQuery>,
  res: Response,
): Promise<void> => {
  const products = await productService.getProductSuggestions(req.validatedQuery);
  res.status(200).json({ success: true, message: "Product suggestions fetched", data: products });
};

const getBestSellers = async (_req: ValidatedRequest, res: Response): Promise<void> => {
  const products = await productService.getBestSellers();

  res.status(200).json({
    success: true,
    message: "Best sellers fetched",
    data: products,
  });
};

const getRelatedProducts = async (
  req: ValidatedRequest<unknown, ProductIdParam>,
  res: Response,
): Promise<void> => {
  const products = await productService.getRelatedProducts(req.validatedParams.id);

  res.status(200).json({
    success: true,
    message: "Related products fetched",
    data: products,
  });
};

const getSingleProduct = async (
  req: ValidatedRequest<unknown, ProductIdParam>,
  res: Response,
): Promise<void> => {
  const { id } = req.validatedParams;
  const product = await productService.getSingleProduct(
    id,
    req.auth?.role === "ADMIN" && req.auth.adminRole === "SUPER_ADMIN",
  );

  res.status(200).json({
    success: true,
    message: "Product fetched",
    data: product,
  });
};

const updateProduct = async (
  req: ValidatedRequest<UpdateProductInput, ProductIdParam>,
  res: Response,
): Promise<void> => {
  if (
    req.validatedBody.commissionPerUnit !== undefined &&
    req.auth?.adminRole !== "SUPER_ADMIN"
  ) {
    throw AppError.forbidden("Only the store owner can change staff commission rates");
  }

  const { id } = req.validatedParams;
  const files = Array.isArray(req.files) ? req.files : [];
  const uploaded =
    files.length === 0
      ? []
      : await Promise.all(
          files.map((file) => uploadImageBuffer(file.buffer, "ecommerce/products", file.mimetype, file.originalname)),
        );

  let product;
  try {
    product = await productService.updateProduct(
      id,
      req.validatedBody,
      uploaded.map((image) => ({ url: image.url, alt: req.validatedBody.name ?? "" })),
    );
  } catch (error) {
    await deleteCloudinaryImages(uploaded.map((image) => image.publicId));
    throw error;
  }

  res.status(200).json({
    success: true,
    message: "Product updated",
    data: product,
  });
};

const deleteProduct = async (
  req: ValidatedRequest<unknown, ProductIdParam>,
  res: Response,
): Promise<void> => {
  const { id } = req.validatedParams;
  const result = await productService.deleteProduct(id);

  res.status(200).json({
    success: true,
    message: result.archived
      ? "Product archived. It stays on past orders and is hidden from the shop."
      : "Product deleted",
    data: result,
  });
};

const deleteProductImage = async (
  req: ValidatedRequest<unknown, ProductImageParam>,
  res: Response,
): Promise<void> => {
  const { id, imageId } = req.validatedParams;
  const result = await productService.deleteProductImage(id, imageId);

  res.status(200).json({
    success: true,
    message: "Product image deleted",
    data: result,
  });
};

export const productController = {
  createProduct,
  getAllProducts,
  getProductSuggestions,
  getBestSellers,
  getRelatedProducts,
  getSingleProduct,
  updateProduct,
  deleteProductImage,
  deleteProduct,
};
