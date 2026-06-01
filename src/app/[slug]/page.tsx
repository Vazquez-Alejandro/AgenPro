import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TenantBookingPage from "./TenantBookingPage";

export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const reserved = [
    "admin", "dashboard", "login", "register", "reservar",
    "turno", "api", "auth",
  ];
  if (reserved.includes(slug)) notFound();

  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!tenant) notFound();

  return <TenantBookingPage tenant={tenant} />;
}
