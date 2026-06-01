const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

function normalizePhone(phone: string): string | null {
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }
  if (!/^\d+$/.test(cleaned)) return null;
  if (cleaned.length < 10) return null;
  return `whatsapp:+${cleaned}`;
}

export async function sendWhatsApp(
  to: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!twilioAccountSid || !twilioAuthToken) {
    console.warn("Twilio no configurado");
    return { success: false, error: "Twilio no configurado" };
  }

  const toNormalized = normalizePhone(to);
  if (!toNormalized) {
    return { success: false, error: "Número inválido" };
  }

  const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

  try {
    const body = new URLSearchParams({
      From: twilioFrom,
      To: toNormalized,
      Body: message,
    });

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.message || "Error Twilio" };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error de conexión";
    return { success: false, error: msg };
  }
}
