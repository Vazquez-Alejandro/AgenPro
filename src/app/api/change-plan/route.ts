import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_PLANS = ["free", "pro", "premium"];

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { planName } = await req.json();
  if (!planName || !VALID_PLANS.includes(planName)) {
    return NextResponse.json(
      { error: "Plan inválido. Planes válidos: " + VALID_PLANS.join(", ") },
      { status: 400 }
    );
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
    .eq("key", planName)
    .single();

  if (!plan) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
  }

  // Only allow downgrade or same plan without payment
  // Upgrades require going through checkout flow (future: Stripe/MP subscription)
  const { data: currentTenant } = await supabase
    .from("tenants")
    .select("subscription_status")
    .eq("id", profile.tenant_id)
    .single();

  const planOrder = ["free", "pro", "premium"];
  const currentIdx = planOrder.indexOf(currentTenant?.subscription_status || "free");
  const newIdx = planOrder.indexOf(planName);

  if (newIdx > currentIdx) {
    return NextResponse.json(
      { error: "Para upgrade, completá el pago en la sección de planes" },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("tenants")
    .update({
      subscription_status: plan.key,
      appointments_limit: plan.appointments_limit,
      staff_limit: plan.staff_limit,
    })
    .eq("id", profile.tenant_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    plan: {
      name: plan.name,
      appointments_limit: plan.appointments_limit,
      staff_limit: plan.staff_limit,
    },
  });
}
