import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

export async function POST(request: Request) {
  if (!mpAccessToken) {
    return NextResponse.json(
      { error: "Mercado Pago no configurado" },
      { status: 500 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
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
