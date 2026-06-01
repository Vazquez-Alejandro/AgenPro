"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Save,
  Loader2,
  Upload,
  Building2,
  Globe,
  Palette,
  Crown,
  Check,
  ArrowUp,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { useTenant } from "@/contexts/TenantContext";
import type { PlanDefinition } from "@/types";

const PLAN_COLORS: Record<string, string> = {
  free: "#6b7280",
  inicial: "#10b981",
  profesional: "#3b82f6",
  premium: "#f59e0b",
};

function planDisplayName(name: string): string {
  const names: Record<string, string> = {
    free: "Gratuito",
    inicial: "Inicial",
    profesional: "Profesional",
    premium: "Premium",
  };
  return names[name] || name;
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(cents / 100);
}

export default function SettingsContent() {
  const { tenant, loading: tenantLoading } = useTenant();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#10b981");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [saved, setSaved] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const supabase = useRef(createClient()).current;
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name);
      setSlug(tenant.slug);
      setPrimaryColor(tenant.primary_color || "#10b981");
      setLogoUrl(tenant.logo_url);
    }
    fetchPlans();
  }, [tenant]);

  const fetchPlans = async () => {
    const { data } = await supabase
      .from("plan_definitions")
      .select("*")
      .order("price_monthly_cents");
    if (data) setPlans(data as PlanDefinition[]);
  };

  const handleChangePlan = async (planName: string) => {
    setUpgrading(planName);
    const res = await fetch("/api/change-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planName }),
    });
    const data = await res.json();
    setUpgrading(null);
    if (!res.ok) {
      toast(data.error || "Error al cambiar de plan", "error");
      return;
    }
    toast(`Plan actualizado a ${planDisplayName(planName)}`, "success");
    window.location.reload();
  };

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenant) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `${tenant.id}/logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("tenant-logos")
      .upload(fileName, file);

    if (uploadError) {
      toast("Error al subir el logo", "error");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("tenant-logos")
      .getPublicUrl(fileName);

    setLogoUrl(urlData.publicUrl);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!tenant || !name.trim()) return;
    setSaving(true);
    setSaved(false);

    const updates: Record<string, unknown> = {
      name: name.trim(),
      primary_color: primaryColor,
    };
    if (logoUrl) updates.logo_url = logoUrl;

    const { error } = await supabase
      .from("tenants")
      .update(updates)
      .eq("id", tenant.id);

    if (error) {
      toast("Error al guardar", "error");
    } else {
      setSaved(true);
      toast("Configuración guardada", "success");
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!tenant) {
    return <p className="text-white/50 text-center py-16">No se encontró el negocio</p>;
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Configuración del Negocio</h1>

      {/* Logo */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">
          Logo
        </h2>
        <div className="flex items-center gap-6">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white overflow-hidden border border-white/10"
            style={{ backgroundColor: primaryColor }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              tenant.name.charAt(0)
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={uploadLogo}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/70 rounded-xl text-sm hover:bg-white/10 transition-all"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {logoUrl ? "Cambiar logo" : "Subir logo"}
            </button>
            <p className="text-xs text-white/30 mt-2">
              PNG, JPG. Recomendado: 256x256px
            </p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">
          Información
        </h2>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Nombre del negocio
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            URL pública
          </label>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
            <span className="text-white/30 text-sm">tudominio.com/</span>
            <span className="text-white font-medium">{slug}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" />
            Color principal
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
            />
            <span className="text-sm text-white/50 font-mono">{primaryColor}</span>
            <div className="flex gap-1">
              {["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"].map(
                (c) => (
                  <button
                    key={c}
                    onClick={() => setPrimaryColor(c)}
                    className="w-6 h-6 rounded-full border border-white/10 transition-transform hover:scale-110"
                    style={{ backgroundColor: c }}
                  />
                )
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-400 transition-all disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved ? "Guardado" : "Guardar Cambios"}
        </button>
      </div>

      {/* Plan */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-400" />
          Plan actual
        </h2>

        <div className="flex items-center gap-3 mb-4">
          <div
            className="px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: `${PLAN_COLORS[tenant.subscription_status] || "#6b7280"}20`,
              color: PLAN_COLORS[tenant.subscription_status] || "#6b7280",
            }}
          >
            {planDisplayName(tenant.subscription_status)}
          </div>
          <span className="text-sm text-white/40">
            {tenant.turnos_limit >= 999999
              ? "Turnos ilimitados"
              : `Hasta ${tenant.turnos_limit} turnos/mes`}
            &nbsp;&middot;&nbsp;
            {tenant.staff_limit >= 999
              ? "Staff ilimitado"
              : `Hasta ${tenant.staff_limit} miembros`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {plans.map((plan) => {
            const isCurrent = tenant.subscription_status === plan.name;
            const isLoading = upgrading === plan.name;
            return (
              <div
                key={plan.name}
                className={`p-4 rounded-xl border transition-all flex flex-col ${
                  isCurrent
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <p className="text-sm font-semibold text-white">{planDisplayName(plan.name)}</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {plan.price_monthly_cents === 0
                    ? "Gratis"
                    : formatPrice(plan.price_monthly_cents)}
                  {plan.price_monthly_cents > 0 && (
                    <span className="text-xs text-white/40 font-normal">/mes</span>
                  )}
                </p>
                <p className="mt-3 text-xs text-white/50 flex-1">{plan.description}</p>
                {isCurrent ? (
                  <p className="text-xs text-emerald-400 mt-3 font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" /> Plan actual
                  </p>
                ) : (
                  <button
                    onClick={() => handleChangePlan(plan.name)}
                    disabled={isLoading}
                    className={`mt-3 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      plan.price_monthly_cents === 0
                        ? "bg-white/5 text-white/60 hover:bg-white/10"
                        : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                    } disabled:opacity-50`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ArrowUp className="w-3 h-3" />
                    )}
                    {plan.price_monthly_cents === 0 ? "Degradar" : "Seleccionar"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
