import { Router } from "express";
import { asyncHandler } from "../../app/middlewares/asyncHandler";
import { mohasagorController } from "./mohasagor.controller";

const router = Router();

router.get("/products", asyncHandler(mohasagorController.getProducts));

export const mohasagorRoutes = router;
