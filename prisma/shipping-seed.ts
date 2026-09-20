import { PrismaClient } from "@prisma/client";
import { WILAYA_NAMES, ALGERIAN_WILAYAS } from "../src/lib/algeria";
import { getDefaultShippingPrices } from "../src/lib/shipping";

export async function syncWilayaArabicNames(prisma: PrismaClient) {
  for (const w of WILAYA_NAMES) {
    await prisma.wilaya.updateMany({
      where: { code: w.code },
      data: { nameFr: w.nameFr, nameAr: w.nameAr },
    });
  }
}

export async function seedShipping(prisma: PrismaClient) {
  await prisma.deliveryOffice.deleteMany();
  await prisma.wilaya.deleteMany();

  for (const w of WILAYA_NAMES) {
    const prices = getDefaultShippingPrices(w.code);
    const offices = ALGERIAN_WILAYAS.find((x) => x.code === w.code)?.offices ?? [];
    await prisma.wilaya.create({
      data: {
        code: w.code,
        nameFr: w.nameFr,
        nameAr: w.nameAr,
        homeShippingPrice: prices.home,
        officeShippingPrice: prices.office,
        offices: {
          create: offices.map((office) => ({
            nameFr: office.nameFr,
            nameAr: office.nameAr,
          })),
        },
      },
    });
  }
}
