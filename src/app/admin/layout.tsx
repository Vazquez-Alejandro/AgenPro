import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSidebar from "@/components/AdminSidebar";

export const metadata: Metadata = {
  title: "Admin - AgenPro",
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
      <AdminSidebar tenantSlug={tenantSlug} />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">{children}</main>
    </div>
  );
}
