import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  LayoutDashboard,
  Calendar,
  Clock,
  Ban,
  Scissors,
  Settings,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Admin - TurnosOnline",
};

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/agenda", label: "Agenda", icon: Calendar },
  { href: "/admin/availability", label: "Horarios", icon: Clock },
  { href: "/admin/blocked-dates", label: "Días Bloqueados", icon: Ban },
  { href: "/admin/services", label: "Servicios", icon: Scissors },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
];

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
    .select("is_admin, role, tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/dashboard");

  let tenantSlug: string | null = null;
  if (profile.tenant_id) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("slug")
      .eq("id", profile.tenant_id)
      .single();
    tenantSlug = tenant?.slug || null;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      <aside className="w-56 border-r border-white/5 p-4 space-y-1 shrink-0 overflow-y-auto">
        <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wider px-3 mb-4">
          Admin
        </h2>
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <link.icon className="w-4 h-4" />
            {link.label}
          </a>
        ))}

        {tenantSlug && (
          <div className="border-t border-white/5 pt-3 mt-3">
            <a
              href={`/${tenantSlug}`}
              target="_blank"
              className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Ver página pública
            </a>
          </div>
        )}
      </aside>
      <main className="flex-1 p-6 overflow-y-auto">{children}</main>
    </div>
  );
}
