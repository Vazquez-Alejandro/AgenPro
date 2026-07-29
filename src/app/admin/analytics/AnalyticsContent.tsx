"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, TrendingUp, Calendar, Users, DollarSign } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { formatPrice } from "@/lib/utils";

interface DayStats {
  date: string;
  count: number;
}

export default function AnalyticsContent() {
  const { tenant } = useTenant();
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [monthAppointments, setMonthAppointments] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [uniqueClients, setUniqueClients] = useState(0);
  const [dailyStats, setDailyStats] = useState<DayStats[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useRef(createClient()).current;

  useEffect(() => {
    fetchStats();
  }, [tenant]);

  const fetchStats = async () => {
    if (!tenant) { setLoading(false); return; }

    // Total appointments
    const { count: total } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenant.id);
    setTotalAppointments(total || 0);

    // This month appointments
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const startStr = startOfMonth.toISOString().split("T")[0];

    const { count: monthCount } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .gte("date", startStr);
    setMonthAppointments(monthCount || 0);

    // Monthly income (from paid appointments)
    const { data: paidAppts } = await supabase
      .from("appointments")
      .select("amount_paid")
      .eq("tenant_id", tenant.id)
      .eq("payment_status", "paid")
      .gte("date", startStr);
    const income = (paidAppts || []).reduce((sum: number, a: { amount_paid?: number }) => sum + (a.amount_paid || 0), 0);
    setMonthIncome(income);

    // Unique clients
    const { data: clientEmails } = await supabase
      .from("appointments")
      .select("client_email")
      .eq("tenant_id", tenant.id)
      .not("client_email", "is", null);
    const uniqueEmails = new Set((clientEmails || []).map((a: { client_email?: string }) => a.client_email));
    setUniqueClients(uniqueEmails.size);

    // Daily stats for last 7 days
    const last7Days: DayStats[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const { count } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("date", dateStr);
      last7Days.push({
        date: d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric" }),
        count: count || 0,
      });
    }
    setDailyStats(last7Days);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
      </div>
    );
  }

  const maxDaily = Math.max(...dailyStats.map((d) => d.count), 1);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-amber-400" />
        Estadísticas
      </h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-white/40">Total</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalAppointments}</p>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-white/40">Este mes</span>
          </div>
          <p className="text-2xl font-bold text-white">{monthAppointments}</p>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-white/40">Ingresos</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatPrice(monthIncome)}</p>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-white/40">Clientes</span>
          </div>
          <p className="text-2xl font-bold text-white">{uniqueClients}</p>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">
          Turnos últimos 7 días
        </h2>
        <div className="flex items-end gap-2 h-40">
          {dailyStats.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-white/40">{day.count}</span>
              <div
                className="w-full bg-amber-500/30 rounded-t-lg transition-all"
                style={{ height: `${(day.count / maxDaily) * 100}%`, minHeight: day.count > 0 ? "8px" : "2px" }}
              />
              <span className="text-[10px] text-white/30">{day.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
