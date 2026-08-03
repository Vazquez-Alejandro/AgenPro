import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const origin = process.env.NEXT_PUBLIC_ORIGIN || "http://localhost:3000";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!mpAccessToken) {
    return NextResponse.json(
      { error: "Mercado Pago no configurado" },
      { status: 500 }
    );
  }

  const { service_id, client_name, client_email } = await request.json();

  if (!service_id) {
    return NextResponse.json({ error: "service_id requerido" }, { status: 400 });
  }

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id, name, price, tenant_id")
    .eq("id", service_id)
    .single();

  if (serviceError || !service) {
    return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
  }

  const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
  if (profile && service.tenant_id !== profile.tenant_id) {
    return NextResponse.json({ error: "Servicio no autorizado" }, { status: 403 });
  }

  const amount = service.price;

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Servicio sin precio configurado" }, { status: 400 });
  }

  try {
    const response = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              title: service.name || "Turno",
              quantity: 1,
              currency_id: "ARS",
              unit_price: amount,
            },
          ],
          payer: {
            name: client_name || "",
            email: client_email || "",
          },
          back_urls: {
            success: `${origin}/turno?mp_success=1`,
            failure: `${origin}/turno?mp_failure=1`,
            pending: `${origin}/turno?mp_pending=1`,
          },
          auto_return: "approved",
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Error en Mercado Pago" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      initPoint: data.init_point,
      preferenceId: data.id,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Error al crear preferencia";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
