import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const wilayas = await prisma.wilaya.findMany({
    orderBy: { code: "asc" },
    include: { _count: { select: { offices: true } } },
  });

  return NextResponse.json(wilayas);
}
