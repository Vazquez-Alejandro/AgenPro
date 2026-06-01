import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token requerido" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, confirmed_at")
    .eq("confirmation_token", token)
    .single();

  if (!appointment) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  if (appointment.confirmed_at) {
    return NextResponse.json({ message: "Turno ya confirmado previamente" });
  }

  await supabase
    .from("appointments")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("id", appointment.id);

  return NextResponse.json({ success: true, message: "Turno confirmado" });
}
