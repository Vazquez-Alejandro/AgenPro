"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import type { Appointment } from "@/types";
import {
  Calendar,
  Clock,
  XCircle,
  List,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { CardSkeleton, Skeleton } from "@/components/Skeleton";

export default function DashboardContent() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  const fetchAppointments = async () => {
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .order("date", { ascending: true })
      .order("time", { ascending: true });
    setAppointments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancel = async (id: string) => {
    setCancelling(id);
    await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    fetchAppointments();
    setCancelling(null);
  };

  const statusColors: Record<string, string> = {
    confirmed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
    completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };

  const statusLabels: Record<string, string> = {
    confirmed: "Confirmado",
    cancelled: "Cancelado",
    completed: "Completado",
  };

  const aptMap = new Map<string, Appointment[]>();
  for (const apt of appointments) {
    const key = apt.date;
    if (!aptMap.has(key)) aptMap.set(key, []);
    aptMap.get(key)!.push(apt);
  }

  const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(monthStart);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calDays: Date[] = [];
  let d = calStart;
  while (d <= calEnd) {
    calDays.push(d);
    d = addDays(d, 1);
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Mis Turnos</h1>
            <p className="text-white/50 mt-1">
              {appointments.length}{" "}
              {appointments.length === 1 ? "turno registrado" : "turnos registrados"}
            </p>
          </div>
          <div className="flex bg-white/5 rounded-lg p-0.5">
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                view === "list"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-white/50 hover:text-white"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                view === "calendar"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-white/50 hover:text-white"
              }`}
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
        </div>

        {appointments.length === 0 && view === "list" ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-white/30" />
            </div>
            <h2 className="text-lg font-medium text-white/50 mb-2">
              No tenés turnos reservados
            </h2>
            <button
              onClick={() => router.push("/reservar")}
              className="mt-4 px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/25"
            >
              Reservar Turno
            </button>
          </div>
        ) : view === "calendar" ? (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                className="p-2 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-semibold text-white">
                {format(calendarMonth, "MMMM yyyy", { locale: es })}
              </h3>
              <button
                onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                className="p-2 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekdays.map((w) => (
                <div key={w} className="text-center text-xs font-medium text-white/40 py-2">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayAppts = aptMap.get(key) || [];
                const inMonth = isSameMonth(day, calendarMonth);
                const today = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={`relative min-h-[72px] p-1.5 rounded-xl border transition-all ${
                      inMonth ? "border-white/5" : "border-transparent"
                    } ${today ? "ring-1 ring-emerald-500/30" : ""}`}
                  >
                    <span
                      className={`text-xs font-medium ${
                        inMonth ? "text-white/50" : "text-white/10"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayAppts.slice(0, 3).map((apt) => (
                        <div
                          key={apt.id}
                          className={`text-[10px] px-1 py-0.5 rounded truncate leading-tight ${
                            apt.status === "confirmed"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : apt.status === "cancelled"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          {apt.time} {apt.service}
                        </div>
                      ))}
                      {dayAppts.length > 3 && (
                        <div className="text-[10px] text-white/30 px-1">
                          +{dayAppts.length - 3} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => {
              const aptDate = new Date(apt.date + "T12:00:00");
              const isPast = new Date(apt.date + "T" + apt.time) < new Date();
              return (
                <div
                  key={apt.id}
                  className="group bg-white/[0.02] border border-white/5 rounded-xl p-5 hover:bg-white/[0.04] hover:border-white/10 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-400" />
                        <span className="text-white font-medium">
                          {format(aptDate, "EEEE, dd 'de' MMMM", { locale: es })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-400" />
                        <span className="text-white/70">{apt.time} hs</span>
                      </div>
                      <p className="text-sm text-white/50">{apt.service}</p>
                      {apt.recurring && (
                        <p className="text-xs text-emerald-400/60">
                          Semanal{" "}
                          {apt.recurring_end_date
                            ? `(hasta ${format(new Date(apt.recurring_end_date + "T12:00:00"), "dd/MM/yyyy")})`
                            : ""}
                        </p>
                      )}
                      {apt.notes && (
                        <p className="text-sm text-white/30 italic">{apt.notes}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full border ${
                          statusColors[apt.status]
                        }`}
                      >
                        {isPast && apt.status === "confirmed"
                          ? "Vencido"
                          : statusLabels[apt.status]}
                      </span>
                      {apt.status === "confirmed" && !isPast && (
                        <button
                          onClick={() => handleCancel(apt.id)}
                          disabled={cancelling === apt.id}
                          className="flex items-center gap-1 px-3 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                        >
                          {cancelling === apt.id ? (
                            <div className="w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
