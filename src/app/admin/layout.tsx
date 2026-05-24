import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin - TurnosOnline",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/dashboard");

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      <aside className="w-56 border-r border-white/5 p-4 space-y-1 shrink-0">
        <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wider px-3 mb-4">
          Admin
        </h2>
        <a
          href="/admin"
          className="block px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          Dashboard
        </a>
        <a
          href="/admin/availability"
          className="block px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          Horarios
        </a>
        <a
          href="/admin/blocked-dates"
          className="block px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          Días Bloqueados
        </a>
        <a
          href="/admin/services"
          className="block px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          Servicios
        </a>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
