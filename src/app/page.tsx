import Link from "next/link";
import { Calendar, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Reserva Rápida",
    desc: "Elegí fecha y hora en segundos con nuestro calendario interactivo.",
  },
  {
    icon: Shield,
    title: "Seguro",
    desc: "Tus datos protegidos con autenticación segura via Supabase.",
  },
  {
    icon: Zap,
    title: "En Tiempo Real",
    desc: "Disponibilidad actualizada al instante, sin conflictos de horarios.",
  },
];

export default function Home() {
  return (
    <div className="flex-1">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 relative">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent light:from-black light:via-black light:to-black/60">
                Reservá tu turno
              </span>
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                de forma simple y rápida
              </span>
            </h1>
            <p className="mt-6 text-lg text-white/50 max-w-xl mx-auto">
              Gestioná tus reservas online sin complicaciones. Elegí el día y
              horario que mejor te quede.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/turno"
                className="px-8 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/25"
              >
                Sacar Turno
              </Link>
              <Link
                href="/login"
                className="px-8 py-3 bg-white/5 text-white/70 rounded-xl font-medium hover:bg-white/10 hover:text-white transition-all border border-white/10"
              >
                Mis Turnos
              </Link>
            </div>
            <p className="mt-4 text-sm text-white/30">
              Sin registro. Rápido y sencillo.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                <f.icon className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-white/50">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/5 py-8">
        <p className="text-center text-sm text-white/30">
          TurnosOnline &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
