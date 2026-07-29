import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "Stripe no configurado" },
      { status: 500 }
    );
  }

  const { service_id, service_name, amount } = await request.json();

  if (!amount || amount <= 0 || amount > 10000000) {
    return NextResponse.json(
      { error: "Monto inválido" },
      { status: 400 }
    );
  }

  const Stripe = await import("stripe");
  const stripe = new Stripe.default(stripeSecretKey);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: "ars",
      description: service_name || "Turno",
      metadata: { service_id, user_id: user.id },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al crear el pago";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
