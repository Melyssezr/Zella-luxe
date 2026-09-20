import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.wilaya.count();
  console.log("Wilayas in DB:", count);
  if (count > 0) {
    const sample = await prisma.wilaya.findMany({ take: 3, orderBy: { code: "asc" } });
    console.log("Sample:", sample.map((w) => `${w.code} ${w.nameFr}`).join(", "));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
