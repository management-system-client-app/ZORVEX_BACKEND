import { Router } from "express";
import { authenticate, authorize } from "../../app/middlewares/auth";
import { asyncHandler } from "../../app/middlewares/asyncHandler";
import { validateRequest } from "../../app/middlewares/validateRequest";
import { staffController } from "./staff.controller";
import {
  createStaffSchema,
  staffIdParamSchema,
  updateStaffContactSchema,
  updateStaffStatusSchema,
} from "./staff.validation";

const router = Router();

router.get(
  "/referrals/:id",
  validateRequest({ params: staffIdParamSchema }),
  asyncHandler(staffController.getReferral),
);

router.use(authenticate, authorize("ADMIN"));

router.get("/", asyncHandler(staffController.list));

router.post(
  "/",
  validateRequest({ body: createStaffSchema }),
  asyncHandler(staffController.create),
);

router.patch(
  "/:id/contact",
  validateRequest({ params: staffIdParamSchema, body: updateStaffContactSchema }),
  asyncHandler(staffController.updateContact),
);

router.patch(
  "/:id/status",
  validateRequest({ params: staffIdParamSchema, body: updateStaffStatusSchema }),
  asyncHandler(staffController.updateStatus),
);

export const staffRoutes = router;
