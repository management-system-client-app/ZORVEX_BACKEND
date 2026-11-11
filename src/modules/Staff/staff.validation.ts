import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters");

export const createStaffSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email: z.email().transform((value) => value.toLowerCase()),
    temporaryPassword: passwordSchema,
  })
  .strict();

export const staffIdParamSchema = z
  .object({
    id: z.uuid(),
  })
  .strict();

export const updateStaffStatusSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type StaffIdParam = z.infer<typeof staffIdParamSchema>;
export type UpdateStaffStatusInput = z.infer<typeof updateStaffStatusSchema>;
