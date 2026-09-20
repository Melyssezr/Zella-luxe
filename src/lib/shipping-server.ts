import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { ShippingOffice, ShippingWilaya } from "@/lib/shipping";

export type CheckoutShippingData = {
  wilayas: ShippingWilaya[];
  officesByWilaya: Record<string, ShippingOffice[]>;
};

const loadCheckoutShippingData = async (): Promise<CheckoutShippingData> => {
  const rows = await prisma.wilaya.findMany({
    where: { active: true },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      nameFr: true,
      nameAr: true,
      homeShippingPrice: true,
      officeShippingPrice: true,
      offices: {
        where: { active: true },
        orderBy: { nameFr: "asc" },
        select: {
          id: true,
          wilayaId: true,
          nameFr: true,
          nameAr: true,
        },
      },
    },
  });

  const officesByWilaya: Record<string, ShippingOffice[]> = {};
  const wilayas: ShippingWilaya[] = rows.map(({ offices, ...wilaya }) => {
    officesByWilaya[wilaya.code] = offices;
    return wilaya;
  });

  return { wilayas, officesByWilaya };
};

export const getCheckoutShippingData = unstable_cache(
  loadCheckoutShippingData,
  ["zella-checkout-shipping-v1"],
  { tags: [CACHE_TAGS.shipping], revalidate: 86400 }
);
