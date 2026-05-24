import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.1.2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseKey);
const resend = new Resend(resendApiKey);

Deno.serve(async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("*, users:user_id(email)")
      .eq("date", dateStr)
      .eq("status", "confirmed");

    if (error) throw error;

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ message: "No hay turnos para mañana" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const apt of appointments) {
      const userEmail = apt.users?.email;
      if (!userEmail) continue;

      const { data: error } = await resend.emails.send({
        from: "TurnosOnline <recordatorios@tu-dominio.com>",
        to: [userEmail],
        subject: "Recordatorio: Tenés un turno mañana",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0a0a0a;color:#ededed;padding:32px;border-radius:16px">
            <h1 style="color:#34d399;font-size:24px;margin:0 0 16px">⏰ Recordatorio</h1>
            <p style="color:#a1a1aa;margin:0 0 24px">Recordá que tenés un turno agendado:</p>
            <div style="background:#1a1a1a;border-radius:12px;padding:16px;margin-bottom:24px">
              <p style="margin:0 0 8px;color:#ededed"><strong>Fecha:</strong> ${new Date(apt.date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
              <p style="margin:0 0 8px;color:#ededed"><strong>Horario:</strong> ${apt.time} hs</p>
              <p style="margin:0;color:#ededed"><strong>Servicio:</strong> ${apt.service}</p>
            </div>
            <p style="color:#52525b;font-size:12px;margin:0">TurnosOnline — Reserva de Turnos</p>
          </div>
        `,
      });

      if (error) {
        results.push({ email: userEmail, error });
      } else {
        results.push({ email: userEmail, sent: true });
      }
    }

    return new Response(JSON.stringify({ sent: results.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
