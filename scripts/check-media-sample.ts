import { PrismaClient } from "@prisma/client";
import { access } from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const prod = await prisma.product.findFirst({
    where: { active: true },
    select: { slug: true, images: true, colors: true },
  });
  console.log(JSON.stringify(prod, null, 2));
  const images = JSON.parse(prod?.images || "[]") as string[];
  for (const img of images.slice(0, 3)) {
    const abs = path.join(process.cwd(), "public", img.replace(/^\//, ""));
    try {
      await access(abs);
      console.log("OK file", img);
    } catch {
      console.log("MISSING file", img);
    }
  }
}

main()
  .finally(() => prisma.$disconnect());
