import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
const twilioFrom =
  Deno.env.get("TWILIO_WHATSAPP_NUMBER") || "whatsapp:+14155238886";

if (!supabaseUrl || !supabaseKey || !twilioAccountSid || !twilioAuthToken) {
  console.error("Missing required environment variables");
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizePhone(phone: string): string | null {
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("+")) cleaned = cleaned.substring(1);
  if (!/^\d+$/.test(cleaned)) return null;
  if (cleaned.length < 10) return null;
  return `whatsapp:+${cleaned}`;
}

async function sendTwilioMessage(
  to: string,
  body: string
): Promise<boolean> {
  const toNormalized = normalizePhone(to);
  if (!toNormalized) return false;

  const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
  const params = new URLSearchParams({ From: twilioFrom, To: toNormalized, Body: body });

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

Deno.serve(async () => {
  if (!twilioAccountSid || !twilioAuthToken) {
    return new Response(
      JSON.stringify({ error: "Twilio no configurado" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentTotalMin = currentHour * 60 + currentMin;

  const results: string[] = [];

  try {
    // --- 24h reminder: appointments tomorrow ---
    const { data: tomorrowApps, error: err1 } = await supabase
      .from("appointments")
      .select("*")
      .eq("date", tomorrowStr)
      .eq("status", "confirmed")
      .eq("reminder_24h_sent", false)
      .not("client_phone", "is", null);

    if (err1) throw err1;

    for (const apt of tomorrowApps || []) {
      const phone = apt.client_phone;
      if (!phone) continue;

      const msg = `⏰ *Recordatorio* 📅

Hola ${apt.client_name}! Te recordamos que mañana tenés tu turno:

📅 *Fecha:* ${formatDate(apt.date)}
⏰ *Horario:* ${apt.time} hs
💇 *Servicio:* ${apt.service}

Te esperamos!`;

      const ok = await sendTwilioMessage(phone, msg);
      if (ok) {
        await supabase
          .from("appointments")
          .update({ reminder_24h_sent: true })
          .eq("id", apt.id);
        results.push(`24h: ${apt.client_name} (${apt.time})`);
      }
    }

    // --- 1h reminder: appointments today within next 60 min ---
    const { data: todayApps, error: err2 } = await supabase
      .from("appointments")
      .select("*")
      .eq("date", today)
      .eq("status", "confirmed")
      .eq("reminder_1h_sent", false)
      .not("client_phone", "is", null);

    if (err2) throw err2;

    for (const apt of todayApps || []) {
      const [h, m] = apt.time.split(":").map(Number);
      const aptTotalMin = h * 60 + m;
      const diff = aptTotalMin - currentTotalMin;

      if (diff > 0 && diff <= 60) {
        const phone = apt.client_phone;
        if (!phone) continue;

        const msg = `⏰ *Recordatorio* ⏰

Hola ${apt.client_name}! En aproximadamente 1 hora tenés tu turno:

📅 *Fecha:* ${formatDate(apt.date)}
⏰ *Horario:* ${apt.time} hs
💇 *Servicio:* ${apt.service}

No faltes!`;

        const ok = await sendTwilioMessage(phone, msg);
        if (ok) {
          await supabase
            .from("appointments")
            .update({ reminder_1h_sent: true })
            .eq("id", apt.id);
          results.push(`1h: ${apt.client_name} (${apt.time})`);
        }
      }
    }

    return new Response(
      JSON.stringify({ sent: results.length, details: results }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
