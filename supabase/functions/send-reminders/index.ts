import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.1.2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const emailFrom = Deno.env.get("EMAIL_FROM") || "AgenPro <noreply@tu-dominio.com>";

if (!supabaseUrl || !supabaseKey || !resendApiKey) {
  console.error("Missing required environment variables");
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const resend = new Resend(resendApiKey);

Deno.serve(async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("id, date, time, service, client_name, client_email, tenant_id")
      .eq("date", dateStr)
      .eq("status", "confirmed")
      .not("client_email", "is", null);

    if (error) throw error;

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ message: "No hay turnos para mañana" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const apt of appointments) {
      if (!apt.client_email) continue;

      const { error: sendError } = await resend.emails.send({
        from: emailFrom,
        to: [apt.client_email],
        subject: "Recordatorio: Tenés un turno mañana",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0a0a0a;color:#ededed;padding:32px;border-radius:16px">
            <h1 style="color:#34d399;font-size:24px;margin:0 0 16px">⏰ Recordatorio</h1>
            <p style="color:#a1a1aa;margin:0 0 24px">Hola ${apt.client_name || ""}, recordá que tenés un turno agendado:</p>
            <div style="background:#1a1a1a;border-radius:12px;padding:16px;margin-bottom:24px">
              <p style="margin:0 0 8px;color:#ededed"><strong>Fecha:</strong> ${new Date(apt.date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
              <p style="margin:0 0 8px;color:#ededed"><strong>Horario:</strong> ${apt.time} hs</p>
              <p style="margin:0;color:#ededed"><strong>Servicio:</strong> ${apt.service}</p>
            </div>
            <p style="color:#52525b;font-size:12px;margin:0">AgenPro — Reserva de Turnos</p>
          </div>
        `,
      });

      if (sendError) {
        results.push({ email: apt.client_email, error: sendError.message });
      } else {
        results.push({ email: apt.client_email, sent: true });
      }
    }

    return new Response(JSON.stringify({ sent: results.length, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
