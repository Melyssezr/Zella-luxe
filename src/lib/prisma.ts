import { Prisma, PrismaClient } from "@prisma/client";

/** Incrémenter après chaque changement de schéma Prisma pour invalider le cache dev */
const PRISMA_SCHEMA_VERSION = 4;

type GlobalPrisma = {
  prisma?: PrismaClient;
  prismaSchemaVersion?: number;
};

const globalForPrisma = globalThis as unknown as GlobalPrisma;

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : [],
  });
}

function isStalePrismaClient(client?: PrismaClient): boolean {
  if (!client || globalForPrisma.prismaSchemaVersion !== PRISMA_SCHEMA_VERSION) {
    return true;
  }
  const reviewFields = Prisma.ReviewScalarFieldEnum;
  if (!("instagramHandle" in reviewFields) || "email" in reviewFields) {
    return true;
  }
  const contactFields = Prisma.ContactMessageScalarFieldEnum;
  if (!("instagramHandle" in contactFields) || "email" in contactFields) {
    return true;
  }
  return typeof client.wilaya?.findMany !== "function";
}

function getPrismaClient(): PrismaClient {
  const stale = isStalePrismaClient(globalForPrisma.prisma);

  if (stale) {
    if (globalForPrisma.prisma) {
      void globalForPrisma.prisma.$disconnect();
    }
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
  }

  return globalForPrisma.prisma!;
}

export const prisma = getPrismaClient();
