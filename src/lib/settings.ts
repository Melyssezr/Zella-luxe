import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { resolveSocialLinks } from "@/lib/social";
import { CACHE_TAGS } from "@/lib/cache-tags";

export const getSocialLinks = unstable_cache(
  async () => {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
    return resolveSocialLinks(settings);
  },
  ["zella-social-links-v1"],
  { tags: [CACHE_TAGS.settings], revalidate: 86400 }
);
