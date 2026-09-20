import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import AdminShippingClient from "./AdminShippingClient";

export default async function Page() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  return <AdminShippingClient />;
}
