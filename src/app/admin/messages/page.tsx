import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminMessagesPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold admin-page-title">Messages contact</h1>
      <div className="space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`admin-card rounded-xl p-5 ${!msg.read ? "border-[#b8956a]" : ""}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{msg.name}</p>
                <p className="text-sm admin-muted">
                  {msg.instagramHandle && `@${msg.instagramHandle}`}
                  {msg.instagramHandle && msg.phone && " — "}
                  {msg.phone}
                </p>
              </div>
              <span className="text-xs admin-muted">{new Date(msg.createdAt).toLocaleDateString("fr-FR")}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">{msg.message}</p>
          </div>
        ))}
        {messages.length === 0 && <p className="py-12 text-center admin-muted">Aucun message</p>}
      </div>
    </div>
  );
}
