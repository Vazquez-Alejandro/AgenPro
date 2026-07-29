import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TenantBookingPage from "./TenantBookingPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("slug", slug)
    .single();

  if (!tenant) return { title: "No encontrado" };

  return {
    title: `Reservar turno en ${tenant.name} | AgenPro`,
    description: `Reservá tu turno online en ${tenant.name}. Elegí fecha, horario y servicio de forma rápida y sencilla.`,
    openGraph: {
      title: `Reservar turno en ${tenant.name}`,
      description: `Reservá tu turno online en ${tenant.name} de forma rápida y sencilla.`,
      type: "website",
    },
  };
}

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
