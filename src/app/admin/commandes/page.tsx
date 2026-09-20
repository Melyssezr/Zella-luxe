import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import AdminOrdersClient from "./AdminOrdersClient";

export default async function Page() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  return <AdminOrdersClient />;
}
