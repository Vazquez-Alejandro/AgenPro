import { createClient } from "@/lib/supabase/server";
import { Calendar, Users, Clock, Ban } from "lucide-react";

type SB = Awaited<ReturnType<typeof createClient>>;

async function countAll(supabase: SB, table: string, tenantId?: string) {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { count } = await q;
  return count ?? 0;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <p className="text-white/50">No autenticado</p>;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  const tid = profile?.tenant_id;

  const todayStr = new Date().toISOString().split("T")[0];

  let todayQ = supabase.from("appointments").select("*", { count: "exact", head: true });
  if (tid) todayQ = todayQ.eq("tenant_id", tid);
  todayQ = todayQ.eq("date", todayStr).neq("status", "cancelled");
  const { count: todayCount } = await todayQ;

  const [totalAppointments, totalUsers, blocked] = await Promise.all([
    countAll(supabase, "appointments", tid),
    countAll(supabase, "profiles", tid),
    countAll(supabase, "blocked_dates", tid),
  ]);

  const cards = [
    { label: "Turnos Totales", value: totalAppointments, icon: Calendar },
    { label: "Turnos Hoy", value: todayCount ?? 0, icon: Clock },
    { label: "Miembros", value: totalUsers, icon: Users },
    { label: "Días Bloqueados", value: blocked, icon: Ban },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard Admin</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="p-5 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3">
              <c.icon className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-white">{c.value}</p>
            <p className="text-sm text-white/50 mt-1">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
