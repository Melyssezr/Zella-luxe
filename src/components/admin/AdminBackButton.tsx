"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/**
 * Shared admin back control — shown on nested admin pages only.
 * Uses history when the previous page was in admin; otherwise goes to the dashboard.
 */
export function AdminBackButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (!pathname || pathname === "/admin" || pathname.startsWith("/admin/login")) {
    return null;
  }

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (typeof window === "undefined") {
      router.push("/admin");
      return;
    }

    const ref = document.referrer;
    try {
      if (ref) {
        const url = new URL(ref);
        if (
          url.origin === window.location.origin &&
          url.pathname.startsWith("/admin") &&
          !url.pathname.startsWith("/admin/login")
        ) {
          router.back();
          return;
        }
      }
    } catch {
      /* fall through to dashboard */
    }

    router.push("/admin");
  }

  return (
    <div className="admin-back-bar mb-5">
      <Link
        href="/admin"
        onClick={handleClick}
        className="admin-back-link inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <span aria-hidden="true">←</span>
        Retour
      </Link>
    </div>
  );
}
