import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import AdminReviewsClient from "./AdminReviewsClient";

export default async function AdminReviewsPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  return <AdminReviewsClient />;
}
