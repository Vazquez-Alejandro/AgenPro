import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  if (!stripeSecretKey || !stripeWebhookSecret) {
    return NextResponse.json(
      { error: "Stripe no configurado" },
      { status: 500 }
    );
  }

  const Stripe = await import("stripe");
  const stripe = new Stripe.default(stripeSecretKey);

  const body = await request.text();
  const sig = request.headers.get("stripe-signature") || "";

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, stripeWebhookSecret);
  } catch {
    return NextResponse.json(
      { error: "Firma inválida" },
      { status: 400 }
    );
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const supabase = await createClient();

    await supabase
      .from("appointments")
      .update({ payment_status: "paid" })
      .eq("payment_intent_id", paymentIntent.id);
  }

  return NextResponse.json({ received: true });
}
