import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const wilayaCount = await prisma.wilaya.count();
  const officeCount = await prisma.deliveryOffice.count();
  const sample = await prisma.deliveryOffice.findMany({
    take: 5,
    include: { wilaya: { select: { code: true, nameFr: true } } },
  });
  const alger16 = await prisma.wilaya.findUnique({
    where: { code: "16" },
    include: { offices: true },
  });
  console.log(JSON.stringify({ wilayaCount, officeCount, sample, alger16 }, null, 2));
} finally {
  await prisma.$disconnect();
}
