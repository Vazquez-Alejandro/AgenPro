import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const rateCheck = checkRateLimit(`booking:${user.id}`, 5, 60000);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error:
          "Demasiadas reservas. Esperá un minuto antes de intentar de nuevo.",
      },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { date, time, service, service_id, notes, recurring, recurring_end_date } = body;

  if (!date || !time || !service_id) {
    return NextResponse.json(
      { error: "Faltan campos requeridos" },
      { status: 400 }
    );
  }

  const datesToCreate = [date];
  if (recurring && recurring_end_date) {
    const end = new Date(recurring_end_date);
    let current = new Date(date);
    current.setDate(current.getDate() + 7);
    while (current <= end) {
      datesToCreate.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 7);
    }
  }

  const appointments = datesToCreate.map((d: string) => ({
    user_id: user.id,
    date: d,
    time,
    service,
    service_id,
    notes: notes || null,
    status: "confirmed",
    recurring: !!recurring,
    recurring_end_date: recurring ? recurring_end_date || null : null,
  }));

  const { error } = await supabase.from("appointments").insert(appointments);

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("unique")
          ? "Uno o más horarios ya fueron reservados"
          : error.message,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true, count: datesToCreate.length });
}
