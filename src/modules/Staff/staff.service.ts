import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../app/config/prisma";
import { AppError } from "../../app/errors/AppError";
import { NotFoundError } from "../../app/errors/NotFoundError";
import type { AuthContext } from "../../app/middlewares/auth";
import { hashPassword } from "../../utils/bcrypt";
import type { CreateStaffInput } from "./staff.validation";

const MAX_STAFF_ACCOUNTS = 20;

const staffSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  whatsappNumber: true,
  role: true,
  avatarUrl: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AdminSelect;

const assertOwner = (auth: AuthContext): void => {
  if (auth.role !== "ADMIN" || auth.adminRole !== "SUPER_ADMIN") {
    throw AppError.forbidden("Only the store owner can manage staff accounts");
  }
};

const listStaff = async (auth: AuthContext) => {
  assertOwner(auth);

  const [staff, activeCount] = await prisma.$transaction([
    prisma.admin.findMany({
      where: { role: "SUPPORT" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: staffSelect,
    }),
    prisma.admin.count({ where: { role: "SUPPORT", isActive: true } }),
  ]);

  const commissionOrders = staff.length
    ? await prisma.order.findMany({
        where: {
          status: "DELIVERED",
          referredByStaffId: { in: staff.map((account) => account.id) },
        },
        select: {
          referredByStaffId: true,
          staffCommissionPaidAt: true,
          items: {
            select: {
              quantity: true,
              commissionPerUnit: true,
            },
          },
        },
      })
    : [];
  const commissions = new Map<string, { due: number; paid: number }>();

  for (const order of commissionOrders) {
    if (!order.referredByStaffId) continue;

    const total = order.items.reduce(
      (sum, item) => sum + Number(item.commissionPerUnit) * item.quantity,
      0,
    );
    const accountTotals = commissions.get(order.referredByStaffId) ?? { due: 0, paid: 0 };
    if (order.staffCommissionPaidAt) {
      accountTotals.paid += total;
    } else {
      accountTotals.due += total;
    }
    commissions.set(order.referredByStaffId, accountTotals);
  }

  return {
    staff: staff.map((account) => ({
      ...account,
      commissionDue: commissions.get(account.id)?.due ?? 0,
      commissionPaid: commissions.get(account.id)?.paid ?? 0,
    })),
    meta: {
      total: staff.length,
      activeCount,
      limit: MAX_STAFF_ACCOUNTS,
      remaining: Math.max(0, MAX_STAFF_ACCOUNTS - activeCount),
    },
  };
};

const createStaff = async (auth: AuthContext, input: CreateStaffInput) => {
  assertOwner(auth);

  const passwordHash = await hashPassword(input.temporaryPassword);

  try {
    return await prisma.$transaction(
      async (tx) => {
        const [existingAdmin, existingUser, staffCount] = await Promise.all([
          tx.admin.findUnique({ where: { email: input.email }, select: { id: true } }),
          tx.user.findUnique({ where: { email: input.email }, select: { id: true } }),
          tx.admin.count({ where: { role: "SUPPORT", isActive: true } }),
        ]);

        if (existingAdmin || existingUser) {
          throw AppError.conflict("An account with this email already exists");
        }

        if (staffCount >= MAX_STAFF_ACCOUNTS) {
          throw AppError.conflict(`The store can have at most ${MAX_STAFF_ACCOUNTS} active staff accounts`);
        }

        return tx.admin.create({
          data: {
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            whatsappNumber: input.whatsappNumber,
            passwordHash,
            role: "SUPPORT",
          },
          select: staffSelect,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw AppError.conflict("An account with this email already exists");
      }

      if (error.code === "P2034") {
        throw AppError.conflict("Staff accounts changed at the same time; please retry");
      }
    }

    throw error;
  }
};

const getReferralStaff = async (id: string) => {
  const staff = await prisma.admin.findFirst({
    where: { id, role: "SUPPORT", isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      whatsappNumber: true,
    },
  });

  if (!staff) {
    throw new NotFoundError("Staff referral not found");
  }

  return staff;
};

const updateStaffContact = async (
  auth: AuthContext,
  id: string,
  whatsappNumber: string,
) => {
  assertOwner(auth);

  const staff = await prisma.admin.findUnique({
    where: { id },
    select: { id: true, role: true },
  });

  if (!staff || staff.role !== "SUPPORT") {
    throw new NotFoundError("Staff account not found");
  }

  return prisma.admin.update({
    where: { id },
    data: { whatsappNumber },
    select: staffSelect,
  });
};

const updateStaffStatus = async (auth: AuthContext, id: string, isActive: boolean) => {
  assertOwner(auth);

  const staff = await prisma.admin.findUnique({
    where: { id },
    select: { id: true, role: true },
  });

  if (!staff || staff.role !== "SUPPORT") {
    throw new NotFoundError("Staff account not found");
  }

  return prisma.admin.update({
    where: { id },
    data: { isActive },
    select: staffSelect,
  });
};

export const staffService = {
  listStaff,
  createStaff,
  getReferralStaff,
  updateStaffContact,
  updateStaffStatus,
};
