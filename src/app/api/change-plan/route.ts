import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { planName } = await req.json();
  if (!planName) {
    return NextResponse.json({ error: "Falta el nombre del plan" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin || !profile?.tenant_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { data: plan } = await supabase
    .from("plan_definitions")
    .select("*")
    .eq("name", planName)
    .single();

  if (!plan) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
  }

  const { error } = await supabase
    .from("tenants")
    .update({
      subscription_status: plan.name,
      turnos_limit: plan.max_turnos,
      staff_limit: plan.max_staff,
    })
    .eq("id", profile.tenant_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    plan: {
      name: plan.name,
      max_turnos: plan.max_turnos,
      max_staff: plan.max_staff,
    },
  });
}
