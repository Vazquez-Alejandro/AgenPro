"use client";

import { useState, useEffect, useRef } from "react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import type { Appointment, Service } from "@/types";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  User,
  Scissors,
  CreditCard,
  Loader2,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { useTenant } from "@/contexts/TenantContext";

import { formatPrice } from "@/lib/utils";

type AppWithService = Appointment & { serviceObj?: Service };

export default function AgendaContent() {
  const [todayApps, setTodayApps] = useState<AppWithService[]>([]);
  const [weekApps, setWeekApps] = useState<AppWithService[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [monthIncome, setMonthIncome] = useState(0);
  const [monthPaidCount, setMonthPaidCount] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = useRef(createClient()).current;
  const { toast } = useToast();
  const { tenant } = useTenant();
  const tId = tenant?.id;

  const today = new Date();
  const weekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });

  const fetchAll = async () => {
    setLoading(true);
    const todayStr = format(today, "yyyy-MM-dd");
    const weekStartStr = format(weekStart, "yyyy-MM-dd");
    const weekEndStr = format(weekEnd, "yyyy-MM-dd");
    const monthStart = format(new Date(today.getFullYear(), today.getMonth(), 1), "yyyy-MM-dd");
    const monthEnd = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), "yyyy-MM-dd");

    const svcQuery = supabase.from("services").select("*");
    if (tId) svcQuery.eq("tenant_id", tId);
    const { data: svc } = await svcQuery.order("name");
    const serviceMap = new Map<string, Service>();
    if (svc) {
      setServices(svc);
      svc.forEach((s: Service) => serviceMap.set(s.id, s));
    }

    const todayQ = supabase.from("appointments").select("*");
    if (tId) todayQ.eq("tenant_id", tId);
    todayQ.eq("date", todayStr).order("time");

    const weekQ = supabase.from("appointments").select("*");
    if (tId) weekQ.eq("tenant_id", tId);
    weekQ.gte("date", weekStartStr).lte("date", weekEndStr).order("date").order("time");

    const paidQ = supabase.from("appointments").select("*");
    if (tId) paidQ.eq("tenant_id", tId);
    paidQ.gte("date", monthStart).lte("date", monthEnd).eq("payment_status", "paid");

    const [{ data: todayData }, { data: weekData }, { data: paidData }] =
      await Promise.all([todayQ, weekQ, paidQ]);

    if (todayData) {
      setTodayApps(
        todayData.map((a: Appointment) => ({
          ...a,
          serviceObj: serviceMap.get(a.service_id || ""),
        }))
      );
    }

    if (weekData) {
      setWeekApps(
        weekData.map((a: Appointment) => ({
          ...a,
          serviceObj: serviceMap.get(a.service_id || ""),
        }))
      );
    }

    if (paidData) {
      let total = 0;
      paidData.forEach((a: Appointment) => {
        const s = serviceMap.get(a.service_id || "");
        if (s) total += s.price;
      });
      setMonthIncome(total);
      setMonthPaidCount(paidData.length);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, [weekOffset]);

  const updateStatus = async (id: string, status: string, msg: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast(error.message, "error");
      return;
    }
    toast(msg, "success");
    fetchAll();
  };

  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    weekDays.push(d);
  }

  const appsByDay = weekApps.reduce(
    (acc, a) => {
      const key = a.date;
      if (!acc[key]) acc[key] = [];
      acc[key].push(a);
      return acc;
    },
    {} as Record<string, AppWithService[]>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-white">Agenda del Profesional</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{todayApps.length}</p>
          <p className="text-sm text-white/50 mt-1">Turnos hoy</p>
          {todayApps.length > 0 && (
            <p className="text-xs text-white/30 mt-1">
              {todayApps.filter((a) => a.status === "confirmed").length} pendientes
              &middot; {todayApps.filter((a) => a.status === "completed").length} completados
            </p>
          )}
        </div>

        <div className="p-5 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">
            {weekApps.filter((a) => a.status !== "cancelled").length}
          </p>
          <p className="text-sm text-white/50 mt-1">Turnos esta semana</p>
        </div>

        <div className="p-5 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatPrice(monthIncome)}
          </p>
          <p className="text-sm text-white/50 mt-1">
            Ingresos del mes ({monthPaidCount} turnos)
          </p>
        </div>
      </div>

      {/* Today's appointments */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          Turnos de Hoy — {format(today, "EEEE, dd 'de' MMMM", { locale: es })}
        </h2>

        {todayApps.length === 0 ? (
          <p className="text-white/30 text-center py-8">
            No hay turnos para hoy
          </p>
        ) : (
          <div className="space-y-3">
            {todayApps.map((app) => (
              <AppointmentCard
                key={app.id}
                app={app}
                onConfirm={() =>
                  updateStatus(app.id, "completed", "Turno marcado como completado")
                }
                onCancel={() =>
                  updateStatus(app.id, "cancelled", "Turno cancelado")
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Weekly Agenda */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            Agenda Semanal
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-white/70 min-w-32 text-center">
              {format(weekStart, "d MMM", { locale: es })} —{" "}
              {format(weekEnd, "d MMM", { locale: es })}
            </span>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, i) => {
            const key = format(day, "yyyy-MM-dd");
            const dayApps = appsByDay[key] || [];
            const isToday = format(day, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");

            return (
              <div
                key={i}
                className={`min-h-32 p-2 rounded-xl border ${
                  isToday
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-white/5 bg-white/[0.02]"
                }`}
              >
                <p
                  className={`text-xs font-semibold mb-1 ${
                    isToday ? "text-amber-400" : "text-white/40"
                  }`}
                >
                  {["L", "M", "M", "J", "V", "S", "D"][i]}
                </p>
                <p
                  className={`text-lg font-bold mb-2 ${
                    isToday ? "text-white" : "text-white/60"
                  }`}
                >
                  {format(day, "d")}
                </p>
                <div className="space-y-1">
                  {dayApps.slice(0, 4).map((a) => (
                    <div
                      key={a.id}
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        a.status === "completed"
                          ? "bg-amber-500/20 text-amber-300"
                          : a.status === "cancelled"
                            ? "bg-red-500/20 text-red-300"
                            : "bg-white/10 text-white/70"
                      }`}
                    >
                      {a.time} {a.client_name?.split(" ")[0]}
                    </div>
                  ))}
                  {dayApps.length > 4 && (
                    <p className="text-[10px] text-white/30">
                      +{dayApps.length - 4} más
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AppointmentCard({
  app,
  onConfirm,
  onCancel,
}: {
  app: AppWithService;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const statusColors: Record<string, string> = {
    confirmed: "bg-amber-500/10 text-amber-400",
    completed: "bg-blue-500/10 text-blue-400",
    cancelled: "bg-red-500/10 text-red-400",
  };
  const statusLabels: Record<string, string> = {
    confirmed: "Pendiente",
    completed: "Completado",
    cancelled: "Cancelado",
  };

  return (
    <div className="flex items-start justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-all">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-lg font-bold text-amber-400 tabular-nums">
            {app.time}
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[app.status] || "bg-white/5 text-white/50"}`}
          >
            {statusLabels[app.status] || app.status}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="flex items-center gap-1 text-white/70">
            <User className="w-3.5 h-3.5 text-white/40" />
            {app.client_name || "Sin nombre"}
          </span>
          {app.client_email && (
            <span className="flex items-center gap-1 text-white/50">
              <Mail className="w-3.5 h-3.5 text-white/30" />
              {app.client_email}
            </span>
          )}
          {app.client_phone && (
            <span className="flex items-center gap-1 text-white/50">
              <Phone className="w-3.5 h-3.5 text-white/30" />
              {app.client_phone}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/40 mt-1.5">
          <span className="flex items-center gap-1">
            <Scissors className="w-3 h-3" />
            {app.serviceObj?.name || app.service}
          </span>
          {app.serviceObj && (
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {formatPrice(app.serviceObj.price)}
            </span>
          )}
          {app.payment_status && (
            <span className="flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              {app.payment_status === "paid"
                ? "Pagado"
                : app.payment_status === "unpaid"
                  ? "Pendiente"
                  : app.payment_status}
            </span>
          )}
          {app.notes && (
            <span className="italic">{app.notes}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4 shrink-0">
        {app.status === "confirmed" && (
          <>
            <button
              onClick={onConfirm}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-500/20 transition-all"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Completar
            </button>
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-all"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancelar
            </button>
          </>
        )}
        {app.status === "completed" && (
          <span className="text-xs text-blue-400/60 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Atendido
          </span>
        )}
        {app.status === "cancelled" && (
          <span className="text-xs text-red-400/60 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            Cancelado
          </span>
        )}
      </div>
    </div>
  );
}
