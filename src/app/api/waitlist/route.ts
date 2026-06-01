import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const rateCheck = checkRateLimit(`waitlist:${ip}`, 3, 60000);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Esperá un minuto." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const { tenant_id, date, time, service_id, client_name, client_phone, client_email } = body;

  if (!tenant_id || !date || !time || !client_name) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("waitlist").insert({
    tenant_id,
    date,
    time,
    service_id: service_id || null,
    client_name,
    client_phone: client_phone || null,
    client_email: client_email || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
