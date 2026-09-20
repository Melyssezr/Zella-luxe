import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import AdminOfficesClient from "./AdminOfficesClient";

export default async function Page() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  return <AdminOfficesClient />;
}
