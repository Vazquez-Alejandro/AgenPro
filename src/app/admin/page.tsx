import { createClient } from "@/lib/supabase/server";
import { Calendar, Users, Clock, Ban } from "lucide-react";

export default async function AdminPage() {
  const supabase = await createClient();

  const { count: totalAppointments } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true });

  const { count: todayAppointments } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("date", new Date().toISOString().split("T")[0])
    .neq("status", "cancelled");

  const { count: totalUsers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const { count: blockedDates } = await supabase
    .from("blocked_dates")
    .select("*", { count: "exact", head: true });

  const cards = [
    { label: "Turnos Totales", value: totalAppointments ?? 0, icon: Calendar },
    { label: "Turnos Hoy", value: todayAppointments ?? 0, icon: Clock },
    { label: "Usuarios", value: totalUsers ?? 0, icon: Users },
    { label: "Días Bloqueados", value: blockedDates ?? 0, icon: Ban },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard Admin</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="p-5 bg-white/[0.02] border border-white/5 rounded-xl"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
              <c.icon className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-white">{c.value}</p>
            <p className="text-sm text-white/50 mt-1">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
