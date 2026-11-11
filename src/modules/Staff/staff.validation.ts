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
    whatsappNumber: z.string().trim().min(7).max(24).regex(/^\+?[0-9][0-9\s()-]*$/),
    temporaryPassword: passwordSchema,
  })
  .strict();

export const updateStaffContactSchema = z
  .object({
    whatsappNumber: z.string().trim().min(7).max(24).regex(/^\+?[0-9][0-9\s()-]*$/),
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
export type UpdateStaffContactInput = z.infer<typeof updateStaffContactSchema>;
export type StaffIdParam = z.infer<typeof staffIdParamSchema>;
export type UpdateStaffStatusInput = z.infer<typeof updateStaffStatusSchema>;
