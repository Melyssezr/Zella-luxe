import { PrismaClient } from "@prisma/client";
import { syncWilayaArabicNames } from "./shipping-seed";
import { ensureDefaultCatalogs } from "../src/lib/catalogs";

const prisma = new PrismaClient();

async function main() {
  await syncWilayaArabicNames(prisma);
  await ensureDefaultCatalogs();
  console.log("✅ Wilaya Arabic names and default catalogs synced.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
