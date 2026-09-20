import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import AdminGalleryClient from "./AdminGalleryClient";

export default async function Page() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  return <AdminGalleryClient />;
}
