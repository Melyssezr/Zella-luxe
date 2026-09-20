import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { CACHE_TAGS, expireStorefrontCache } from "@/lib/cache-tags";
import {
  fetchWorldExpressCenters,
  fetchWorldExpressFees,
  isWorldExpressConfigured,
} from "@/lib/world-express";

/**
 * Importe depuis World Express (Ecotrack) :
 * - tarifs domicile / bureau par wilaya
 * - bureaux stop-desk si l’API les expose
 */
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (!isWorldExpressConfigured()) {
    return NextResponse.json(
      { error: "WORLD_EXPRESS_TOKEN manquant" },
      { status: 400 }
    );
  }

  let body: { syncFees?: boolean; syncOffices?: boolean; replaceOffices?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const syncFees = body.syncFees !== false;
  const syncOffices = body.syncOffices !== false;
  const replaceOffices = body.replaceOffices === true;

  const wilayas = await prisma.wilaya.findMany({
    select: { id: true, code: true },
  });
  const byCode = new Map(wilayas.map((w) => [w.code, w]));

  let feesUpdated = 0;
  let feesSkipped = 0;
  let feesError: string | null = null;

  if (syncFees) {
    const feesRes = await fetchWorldExpressFees();
    if (!feesRes.ok) {
      feesError = feesRes.error;
    } else {
      for (const fee of feesRes.fees) {
        const wilaya = byCode.get(fee.wilayaCode);
        if (!wilaya) {
          feesSkipped += 1;
          continue;
        }
        await prisma.wilaya.update({
          where: { id: wilaya.id },
          data: {
            homeShippingPrice: Math.round(fee.homePrice),
            officeShippingPrice: Math.round(fee.officePrice),
          },
        });
        feesUpdated += 1;
      }
    }
  }

  let officesCreated = 0;
  let officesUpdated = 0;
  let officesDeactivated = 0;
  let officesError: string | null = null;
  let officesSource: string | null = null;

  if (syncOffices) {
    const centersRes = await fetchWorldExpressCenters();
    if (!centersRes.ok) {
      officesError = centersRes.error;
    } else {
      officesSource = centersRes.source;
      const keptIds = new Set<string>();
      const wilayasWithCenters = new Set<string>();

      for (const center of centersRes.centers) {
        const wilaya = byCode.get(center.wilayaCode);
        if (!wilaya) continue;
        wilayasWithCenters.add(wilaya.id);

        const nameFr = center.address
          ? `${center.name} — ${center.address}`
          : center.name;

        const existing = await prisma.deliveryOffice.findFirst({
          where: {
            wilayaId: wilaya.id,
            OR: [
              ...(center.stationCode
                ? [{ stationCode: center.stationCode }]
                : []),
              { nameFr: center.name },
              { nameFr },
            ],
          },
        });

        if (existing) {
          await prisma.deliveryOffice.update({
            where: { id: existing.id },
            data: {
              nameFr,
              nameAr: existing.nameAr || center.name,
              stationCode: center.stationCode ?? existing.stationCode,
              address: center.address ?? existing.address,
              active: true,
            },
          });
          keptIds.add(existing.id);
          officesUpdated += 1;
        } else {
          const created = await prisma.deliveryOffice.create({
            data: {
              wilayaId: wilaya.id,
              nameFr,
              nameAr: center.name,
              stationCode: center.stationCode,
              address: center.address,
              active: true,
            },
          });
          keptIds.add(created.id);
          officesCreated += 1;
        }
      }

      if (replaceOffices && keptIds.size > 0 && wilayasWithCenters.size > 0) {
        const result = await prisma.deliveryOffice.updateMany({
          where: {
            active: true,
            wilayaId: { in: [...wilayasWithCenters] },
            id: { notIn: [...keptIds] },
          },
          data: { active: false },
        });
        officesDeactivated = result.count;
      }
    }
  }

  const success = Boolean(
    (syncFees && !feesError) ||
      (syncOffices && !officesError && officesCreated + officesUpdated > 0)
  );
  if (success) {
    expireStorefrontCache(CACHE_TAGS.shipping);
  }

  return NextResponse.json({
    ok: success,
    fees: {
      updated: feesUpdated,
      skipped: feesSkipped,
      error: feesError,
    },
    offices: {
      created: officesCreated,
      updated: officesUpdated,
      deactivated: officesDeactivated,
      source: officesSource,
      error: officesError,
    },
    message: buildMessage({
      feesUpdated,
      feesError,
      officesCreated,
      officesUpdated,
      officesError,
    }),
  });
}

function buildMessage(p: {
  feesUpdated: number;
  feesError: string | null;
  officesCreated: number;
  officesUpdated: number;
  officesError: string | null;
}): string {
  const parts: string[] = [];
  if (p.feesError) parts.push(`Tarifs: ${p.feesError}`);
  else if (p.feesUpdated > 0) parts.push(`${p.feesUpdated} wilaya(s) mises à jour`);
  if (p.officesError) parts.push(`Bureaux: ${p.officesError}`);
  else if (p.officesCreated + p.officesUpdated > 0) {
    parts.push(
      `${p.officesCreated} bureau(x) créé(s), ${p.officesUpdated} mis à jour`
    );
  }
  return parts.join(" · ") || "Rien à importer";
}
