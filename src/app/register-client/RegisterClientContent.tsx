"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { UserPlus, Eye, EyeOff, Building2, Phone, Mail, User } from "lucide-react";
import BackButton from "@/components/BackButton";
import { useLang } from "@/contexts/LangContext";
import type { CustomField } from "@/types";

export default function RegisterClientContent() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useRef(createClient()).current;
  const { t } = useLang();

  const tenantId = searchParams.get("tenant_id");
  const redirect = searchParams.get("redirect") || "/";
  const safeRedirect = redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("tenants")
      .select("custom_fields")
      .eq("id", tenantId)
      .single()
      .then(({ data, error }: { data: any; error: any }) => {
        if (!error && data?.custom_fields) {
          const fields = data.custom_fields as CustomField[];
          setCustomFields(fields.sort((a, b) => a.order - b.order));
          const initial: Record<string, string> = {};
          fields.forEach((f) => (initial[f.name] = ""));
          setCustomValues(initial);
        }
      });
  }, [tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || !email.trim() || !password) {
      setError("Completá todos los campos obligatorios");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Error al crear la cuenta");
      setLoading(false);
      return;
    }

    const custom_data: Record<string, string> = {};
    customFields.forEach((f) => {
      const val = customValues[f.name]?.trim();
      if (val) custom_data[f.name] = val;
    });

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: authData.user.id,
      tenant_id: tenantId,
      role: "client",
      full_name: fullName.trim(),
      is_admin: false,
      custom_data,
    });

    if (profileError) {
      setError("Error al configurar el perfil");
      setLoading(false);
      return;
    }

    router.push(safeRedirect);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <BackButton href={redirect} />
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-6 h-6 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Crear tu Cuenta</h1>
          <p className="text-white/50 mt-2">Registrate para reservar turnos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Nombre completo
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Pérez"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              {t.auth.email}
            </label>
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
            <label className="block text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              Teléfono
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+54 11 1234-5678"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
            />
          </div>

          {customFields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                {field.name}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              {field.type === "date" ? (
                <input
                  type="date"
                  value={customValues[field.name] || ""}
                  onChange={(e) =>
                    setCustomValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                  required={field.required}
                />
              ) : (
                <input
                  type={field.type === "number" ? "number" : "text"}
                  value={customValues[field.name] || ""}
                  onChange={(e) =>
                    setCustomValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                  }
                  placeholder={field.name}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                  required={field.required}
                />
              )}
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
              {t.auth.password}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
                Crear cuenta
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/40">
          {t.auth.hasAccount}{" "}
          <Link
            href={tenantId ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login"}
            className="text-amber-400 hover:text-amber-300 transition-colors"
          >
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
