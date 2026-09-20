import { NextResponse } from "next/server";
import { getActiveCatalogs } from "@/lib/catalogs";

export async function GET() {
  const catalogs = await getActiveCatalogs();
  return NextResponse.json(catalogs);
}
