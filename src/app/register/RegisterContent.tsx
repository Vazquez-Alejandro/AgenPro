"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  UserPlus, Eye, EyeOff, Building2, Globe, Check,
} from "lucide-react";
import BackButton from "@/components/BackButton";

const PLANS = [
  {
    name: "free",
    label: "Gratuito",
    price: "$0",
    desc: "30 turnos/mes, 1 usuario. Ideal para empezar.",
    popular: false,
  },
  {
    name: "inicial",
    label: "Inicial",
    price: "$12/mes",
    desc: "100 turnos/mes, 1 usuario. Para negocios en crecimiento.",
    popular: false,
  },
  {
    name: "profesional",
    label: "Profesional",
    price: "$30/mes",
    desc: "500 turnos/mes, 5 usuarios. Alertas avanzadas y blacklist.",
    popular: true,
  },
  {
    name: "premium",
    label: "Premium",
    price: "$75/mes",
    desc: "Ilimitado. Todo incluido: confirmación WhatsApp, recordatorios, depósito obligatorio.",
    popular: false,
  },
];

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);
}

export default function RegisterContent() {
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("free");
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  const handleBusinessNameChange = (name: string) => {
    setBusinessName(name);
    if (!slugManuallyEdited) {
      setSlug(slugify(name));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!businessName.trim()) {
      setError("El nombre del negocio es obligatorio");
      setLoading(false);
      return;
    }

    if (!slug.trim()) {
      setError("El slug es obligatorio");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    const { error: signUpError, data } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(
        signUpError.message === "User already registered"
          ? "Ya existe una cuenta con ese email"
          : signUpError.message
      );
      setLoading(false);
      return;
    }

    const user = data.user;
    if (!user) {
      setError("Error al crear la cuenta");
      setLoading(false);
      return;
    }

    const { data: existingTenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existingTenant) {
      setError("Esa URL ya está en uso. Elegí otro nombre.");
      setLoading(false);
      return;
    }

    const planLimits: Record<string, { turnos: number; staff: number }> = {
      inicial: { turnos: 100, staff: 1 },
      profesional: { turnos: 500, staff: 5 },
      premium: { turnos: 999999, staff: 999999 },
    };

    const limits = planLimits[selectedPlan] || { turnos: 100, staff: 1 };

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        name: businessName.trim(),
        slug: slug.trim(),
        subscription_status: selectedPlan,
        turnos_limit: limits.turnos,
        staff_limit: limits.staff,
      })
      .select()
      .single();

    if (tenantError || !tenant) {
      setError("Error al crear el negocio: " + (tenantError?.message || ""));
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      tenant_id: tenant.id,
      role: "owner",
      full_name: businessName.trim(),
      is_admin: true,
    });

    if (profileError) {
      setError("Error al configurar el perfil");
      setLoading(false);
      return;
    }

    const availabilityRows = Array.from({ length: 7 }, (_, i) => ({
      tenant_id: tenant.id,
      day_of_week: i,
      enabled: true,
      start_time: "09:00",
      end_time: "18:00",
      slot_duration: 30,
    }));
    await supabase.from("availability").insert(availabilityRows);

    await supabase.from("services").insert({
      tenant_id: tenant.id,
      name: "Turno General",
      duration: 30,
      price: 0,
      active: true,
      cleaning_time: 0,
    });

    router.push("/admin");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <BackButton href="/" />
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Crear tu Negocio</h1>
          <p className="text-white/50 mt-2">Registrate y empezá a recibir turnos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Nombre del negocio
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => handleBusinessNameChange(e.target.value)}
              placeholder="Ej: Peluquería López"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              URL de tu página
            </label>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-amber-500/50 focus-within:border-amber-500/50 transition-all">
              <span className="text-white/30 text-sm shrink-0">tudominio.com/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(slugify(e.target.value));
                  setSlugManuallyEdited(true);
                }}
                placeholder="mi-peluqueria"
                className="bg-transparent text-white placeholder-white/30 focus:outline-none flex-1 min-w-0"
                required
              />
            </div>
          </div>

          <div className="border-t border-white/5 pt-4">
            <p className="text-xs text-white/30 mb-3">Elegí tu plan</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PLANS.map((plan) => {
                const isSelected = selectedPlan === plan.name;
                return (
                  <button
                    key={plan.name}
                    type="button"
                    onClick={() => setSelectedPlan(plan.name)}
                    className={`relative p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-amber-500/50 bg-amber-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/[0.07]"
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2 -right-2 text-[10px] font-semibold bg-amber-500 text-black px-1.5 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                    <p className="text-sm font-semibold text-white">{plan.label}</p>
                    <p className="text-lg font-bold text-white mt-0.5">{plan.price}</p>
                    <p className="text-[11px] text-white/50 mt-1 leading-relaxed">{plan.desc}</p>
                    {isSelected && (
                      <div className="absolute top-2 left-2 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-white/30 mt-2">
              Sin cargo ahora. Te contactaremos para coordinar el pago.
            </p>
          </div>

          <div className="border-t border-white/5 pt-4">
            <p className="text-xs text-white/30 mb-3">Datos de la cuenta</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-2.5 pr-10 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Confirmar Contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetí la contraseña"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Crear Negocio
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/40">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-amber-400 hover:text-amber-300 transition-colors">
            Ingresá
          </Link>
        </p>
      </div>
    </div>
  );
}
