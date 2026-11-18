import type { Request, Response } from "express";
import { AppError } from "../../app/errors/AppError";
import { mohasagorService } from "./mohasagor.service";

const getProducts = async (req: Request, res: Response): Promise<void> => {
  const page = Number(req.query.page ?? 1);
  if (!Number.isInteger(page) || page < 1) {
    throw AppError.badRequest("page must be a positive integer");
  }

  const result = await mohasagorService.getProducts(page);
  res.status(200).json({
    success: true,
    message: "Mohasagor products fetched",
    data: result.products,
    meta: result.meta,
  });
};

export const mohasagorController = { getProducts };
