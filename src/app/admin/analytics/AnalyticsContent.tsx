"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, TrendingUp, Calendar, Users, DollarSign, Clock, XCircle } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { formatPrice } from "@/lib/utils";

interface DayStats {
  date: string;
  count: number;
}

interface SlotStats {
  time: string;
  count: number;
}

export default function AnalyticsContent() {
  const { tenant } = useTenant();
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [monthAppointments, setMonthAppointments] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [uniqueClients, setUniqueClients] = useState(0);
  const [dailyStats, setDailyStats] = useState<DayStats[]>([]);
  const [topSlots, setTopSlots] = useState<SlotStats[]>([]);
  const [cancelRate, setCancelRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = useRef(createClient()).current;

  useEffect(() => {
    fetchStats();
  }, [tenant]);

  const fetchStats = async () => {
    if (!tenant) { setLoading(false); return; }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const startStr = startOfMonth.toISOString().split("T")[0];

    const [totalRes, monthRes, paidRes, clientRes, allRes] = await Promise.all([
      supabase.from("appointments").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      supabase.from("appointments").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id).gte("date", startStr),
      supabase.from("appointments").select("amount_paid").eq("tenant_id", tenant.id).eq("payment_status", "paid").gte("date", startStr),
      supabase.from("appointments").select("client_email").eq("tenant_id", tenant.id).not("client_email", "is", null),
      supabase.from("appointments").select("time, status").eq("tenant_id", tenant.id),
    ]);

    setTotalAppointments(totalRes.count || 0);
    setMonthAppointments(monthRes.count || 0);

    const income = (paidRes.data || []).reduce((sum: number, a: { amount_paid?: number }) => sum + (a.amount_paid || 0), 0);
    setMonthIncome(income);

    const uniqueEmails = new Set((clientRes.data || []).map((a: { client_email?: string }) => a.client_email));
    setUniqueClients(uniqueEmails.size);

    // Top time slots
    const allAppts = allRes.data || [];
    const slotCounts = new Map<string, number>();
    allAppts.forEach((a: { time: string }) => {
      const hour = a.time?.slice(0, 2) + ":00";
      if (hour) slotCounts.set(hour, (slotCounts.get(hour) || 0) + 1);
    });
    const sorted = [...slotCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([time, count]) => ({ time, count }));
    setTopSlots(sorted);

    // Cancel rate
    const total = allAppts.length;
    const cancelled = allAppts.filter((a: { status: string }) => a.status === "cancelled").length;
    setCancelRate(total > 0 ? Math.round((cancelled / total) * 100) : 0);

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
  const maxSlot = Math.max(...topSlots.map((s) => s.count), 1);

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Horarios más pedidos */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Horarios más pedidos
          </h2>
          {topSlots.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-6">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {topSlots.map((slot) => (
                <div key={slot.time}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white/70">{slot.time} hs</span>
                    <span className="text-xs text-white/40">{slot.count} turnos</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500/40 rounded-full"
                      style={{ width: `${(slot.count / maxSlot) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tasa de cancelación */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-amber-400" />
            Cancelaciones
          </h2>
          <div className="flex items-center gap-4">
            <p className="text-4xl font-bold text-white">{cancelRate}%</p>
            <p className="text-sm text-white/40">tasa de cancelación</p>
          </div>
          <div className="mt-4 h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${cancelRate}%`,
                backgroundColor: cancelRate > 30 ? "rgba(239,68,68,0.5)" : cancelRate > 15 ? "rgba(245,158,11,0.5)" : "rgba(34,197,94,0.5)",
              }}
            />
          </div>
          <p className="text-xs text-white/30 mt-2">
            {cancelRate <= 15 ? "Excelente" : cancelRate <= 30 ? "Normal" : "Alto — revisá por qué cancelan"}
          </p>
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
