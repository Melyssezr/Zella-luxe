import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import AdminCatalogsClient from "./AdminCatalogsClient";

export default async function AdminCatalogsPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  return <AdminCatalogsClient />;
}
