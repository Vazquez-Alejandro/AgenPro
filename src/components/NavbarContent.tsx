"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Calendar, LogOut, User, Clock } from "lucide-react";

export default function NavbarContent() {
  const [user, setUser] = useState<boolean | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(!!session);
    });
    return () => sub?.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <nav className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <Clock className="w-6 h-6 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
            <span className="text-xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              TurnosOnline
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
                >
                  <User className="w-4 h-4" />
                  Mis Turnos
                </Link>
                <Link
                  href="/reservar"
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all"
                >
                  <Calendar className="w-4 h-4" />
                  Reservar
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white/50 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Salir
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
                >
                  Ingresar
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm bg-white text-black rounded-lg hover:bg-white/90 transition-all font-medium"
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
