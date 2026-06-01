"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LogIn, Eye, EyeOff } from "lucide-react";
import BackButton from "@/components/BackButton";

export default function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useRef(createClient()).current;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos"
          : error.message
      );
      setLoading(false);
      return;
    }

    const redirect = searchParams.get("redirect") || "/dashboard";
    router.push(redirect);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <BackButton href="/" />
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Bienvenido</h1>
          <p className="text-white/50 mt-2">Ingresá a tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pr-10 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                required
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
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Ingresar
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-white/40 space-y-1">
          <p>
            ¿Querés registrar tu negocio?{" "}
            <Link href="/register" className="text-emerald-400 hover:text-emerald-300 transition-colors">
              Crear cuenta profesional
            </Link>
          </p>
          <p>
            ¿Querés reservar un turno?{" "}
            <Link href="/register-client" className="text-emerald-400 hover:text-emerald-300 transition-colors">
              Crear cuenta de cliente
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
