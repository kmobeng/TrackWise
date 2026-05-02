import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const defaultCategories = [
  { name: "Food", isDefault: true },
  { name: "Transport", isDefault: true },
  { name: "Housing", isDefault: true },
  { name: "Health", isDefault: true },
  { name: "Entertainment", isDefault: true },
  { name: "Shopping", isDefault: true },
  { name: "Education", isDefault: true },
  { name: "Utilities", isDefault: true },
  { name: "Savings", isDefault: true },
  { name: "Other", isDefault: true },
];

async function main() {
  await prisma.category.createMany({
    data: defaultCategories,
    skipDuplicates: true,
  });

  console.log("Default categories seeded successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
