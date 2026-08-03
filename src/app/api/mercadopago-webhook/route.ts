import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const mpWebhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

function verifySignature(body: string, signature: string, secret: string): boolean {
  const parts = Object.fromEntries(
    signature.split(",").map((p) => p.split("="))
  );
  const timestamp = parts.ts;
  const v1 = parts.v1;
  if (!timestamp || !v1) return false;

  const signedPayload = `${timestamp}.${body}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
}

export async function POST(request: Request) {
  if (!mpAccessToken) {
    return NextResponse.json(
      { error: "Mercado Pago no configurado" },
      { status: 500 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-signature") || "";

  if (mpWebhookSecret && signature) {
    if (!verifySignature(rawBody, signature, mpWebhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(rawBody);
  } catch {
    // Some MP notifications come as form-encoded
  }

  const url = new URL(request.url);
  const topic = (url.searchParams.get("topic") || body.type || "") as string;
  const paymentId = (url.searchParams.get("id") || (body.data as Record<string, unknown>)?.id || "") as string;

  // Handle payment notifications
  if (topic === "payment" || (!topic && paymentId)) {
    if (!paymentId) {
      return NextResponse.json({ received: true });
    }

    try {
      const resp = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: { Authorization: `Bearer ${mpAccessToken}` },
        }
      );

      if (!resp.ok) {
        return NextResponse.json(
          { error: "No se pudo verificar el pago" },
          { status: 400 }
        );
      }

      const payment = await resp.json();

      if (payment.status === "approved" || payment.status === "authorized") {
        const extRef = payment.external_reference;
        if (extRef) {
          const supabase = await createClient();
          await supabase
            .from("appointments")
            .update({ payment_status: "paid", payment_id: paymentId })
            .eq("id", extRef);
        }
      }
    } catch (err) {
      console.error("MP webhook error:", err);
    }
  }

  return NextResponse.json({ received: true });
}
