import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "../src/app/config/env";
import logger from "../src/config/logger";
import { hashPassword } from "../src/utils/bcrypt";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the database");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const ADMIN_EMAIL = env.ADMIN_EMAIL;
const ADMIN_PASSWORD = env.ADMIN_PASSWORD;

const categories = [
  { name: "Men", slug: "men", sortOrder: 1 },
  { name: "Women", slug: "women", sortOrder: 2 },
  { name: "Accessories", slug: "accessories", sortOrder: 3 },
  { name: "Electronics & Gadgets", slug: "electronics-gadgets", sortOrder: 4 },
  { name: "Home & Kitchen", slug: "home-kitchen", sortOrder: 5 },
  { name: "Beauty & Personal Care", slug: "beauty-personal-care", sortOrder: 6 },
  { name: "Footwear", slug: "footwear", sortOrder: 7 },
  { name: "Bags & Travel", slug: "bags-travel", sortOrder: 8 },
  { name: "Baby & Kids", slug: "baby-kids", sortOrder: 9 },
  { name: "Books & Stationery", slug: "books-stationery", sortOrder: 10 },
  { name: "Health & Wellness", slug: "health-wellness", sortOrder: 11 },
  { name: "Food & Grocery", slug: "food-grocery", sortOrder: 12 },
  { name: "Sports & Outdoors", slug: "sports-outdoors", sortOrder: 13 },
] as const;

const seed = async (): Promise<void> => {
  const passwordHash = await hashPassword(ADMIN_PASSWORD);

const existingAdmin = await prisma.admin.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true },
  });

  if (!existingAdmin) {
    await prisma.admin.create({
      data: {
        firstName: env.ADMIN_FIRST_NAME,
        lastName: env.ADMIN_LAST_NAME,
        email: ADMIN_EMAIL,
        passwordHash,
        role: "SUPER_ADMIN",
      },
    });
  }

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      create: category,
    });
  }

  const campaignImages = [
    "/uploads/ecommerce/home/f00ab7f9-7575-424a-98b3-34cf13993ee7.jpg",
    "/uploads/ecommerce/home/e559f165-dca7-40d1-8163-c7c8591f2b81.jpg",
    "/uploads/ecommerce/home/d41b1d4b-af3b-470d-b555-1672efbfee3e.jpg",
    "/uploads/ecommerce/home/4a81a04d-818d-4597-aa96-e41aa575fe5c.jpg",
    "/uploads/ecommerce/home/1e90f9cf-643c-4956-a4f9-b8d044a54200.jpg",
    "/uploads/ecommerce/home/16fe2a82-628c-459b-8ecb-c39bc0d7b333.jpg",
    "/uploads/ecommerce/home/154ba077-4669-4e45-8f83-5e18416af0b5.jpg",
  ];

  for (let index = 0; index < 9; index += 1) {
    const id = `demo-home-campaign-${String(index + 1).padStart(2, "0")}`;
    await prisma.homeBlock.upsert({
      where: { id },
      update: {
        kind: "CAMPAIGN",
        title: `Demo campaign ${index + 1}`,
        imageUrl: campaignImages[index % campaignImages.length],
        linkUrl: "/shop",
        sortOrder: -100 + index,
        isActive: true,
      },
      create: {
        id,
        kind: "CAMPAIGN",
        title: `Demo campaign ${index + 1}`,
        imageUrl: campaignImages[index % campaignImages.length],
        linkUrl: "/shop",
        sortOrder: -100 + index,
      },
    });
  }

  logger.info("Seed complete");
};

seed()
  .catch((error: unknown) => {
    logger.error("Seed failed", { error });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
