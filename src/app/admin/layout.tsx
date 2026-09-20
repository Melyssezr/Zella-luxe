import { Suspense } from "react";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminBackButton } from "@/components/admin/AdminBackButton";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const authenticated = await isAdminAuthenticated();

  return (
    <div className="admin-shell">
      {authenticated && (
        <Suspense fallback={<div className="admin-nav h-14" />}>
          <AdminNav />
        </Suspense>
      )}
      <div className="admin-content mx-auto max-w-7xl px-4 py-8 md:px-6">
        {authenticated && (
          <Suspense fallback={null}>
            <AdminBackButton />
          </Suspense>
        )}
        {children}
      </div>
    </div>
  );
}
