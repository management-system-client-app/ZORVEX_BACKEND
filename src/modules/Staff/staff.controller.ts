import type { Response } from "express";
import { AppError } from "../../app/errors/AppError";
import type { ValidatedRequest } from "../../app/middlewares/validateRequest";
import { staffService } from "./staff.service";
import type {
  CreateStaffInput,
  StaffIdParam,
  UpdateStaffStatusInput,
} from "./staff.validation";

const getAuth = (req: ValidatedRequest) => {
  if (!req.auth) {
    throw AppError.unauthorized();
  }

  return req.auth;
};

const list = async (req: ValidatedRequest, res: Response): Promise<void> => {
  const result = await staffService.listStaff(getAuth(req));

  res.status(200).json({
    success: true,
    message: "Staff accounts fetched",
    data: result.staff,
    meta: result.meta,
  });
};

const create = async (
  req: ValidatedRequest<CreateStaffInput>,
  res: Response,
): Promise<void> => {
  const staff = await staffService.createStaff(getAuth(req), req.validatedBody);

  res.status(201).json({
    success: true,
    message: "Staff account created",
    data: staff,
  });
};

const updateStatus = async (
  req: ValidatedRequest<UpdateStaffStatusInput, StaffIdParam>,
  res: Response,
): Promise<void> => {
  const staff = await staffService.updateStaffStatus(
    getAuth(req),
    req.validatedParams.id,
    req.validatedBody.isActive,
  );

  res.status(200).json({
    success: true,
    message: "Staff account status updated",
    data: staff,
  });
};

export const staffController = {
  list,
  create,
  updateStatus,
};
