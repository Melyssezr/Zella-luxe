import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import AdminProductsClient from "./AdminProductsClient";

export default async function Page() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Chargement…</p>}>
      <AdminProductsClient />
    </Suspense>
  );
}
