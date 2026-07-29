"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { format, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import Calendar from "@/components/Calendar";
import TimeSlots from "@/components/TimeSlots";
import type { Service, Availability } from "@/types";
import { CalendarDays, ClipboardList, ArrowLeft, CheckCircle } from "lucide-react";
import BackButton from "@/components/BackButton";
import { useToast } from "@/contexts/ToastContext";
import { useTenant } from "@/contexts/TenantContext";

import { generateTimeSlots } from "@/lib/utils";

export default function ReservarContent() {
  const [step, setStep] = useState<"calendar" | "form" | "confirm">("calendar");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [disabledSlots, setDisabledSlots] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successCount, setSuccessCount] = useState(1);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [recurring, setRecurring] = useState(false);
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const { toast } = useToast();
  const { tenant } = useTenant();

  useEffect(() => {
    fetchServices();
    fetchBlockedDates();
  }, []);

  const fetchBlockedDates = async () => {
    if (!tenant) return;
    const { data } = await supabase.from("blocked_dates").select("date").eq("tenant_id", tenant.id);
    if (data) setBlockedDates(data.map((b: { date: string }) => b.date));
  };

  const fetchServices = async () => {
    if (!tenant) return;
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("active", true)
      .order("name");
    if (data && data.length > 0) {
      setServices(data);
      setSelectedServiceId(data[0].id);
    }
  };

  useEffect(() => {
    if (!selectedDate) return;
    loadTimeSlots();
    fetchDisabledSlots();
  }, [selectedDate]);

  const loadTimeSlots = async () => {
    if (!selectedDate) return;
    const dayOfWeek = getDay(selectedDate);

    if (!tenant) return;
    const { data: blocked } = await supabase
      .from("blocked_dates")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("date", format(selectedDate, "yyyy-MM-dd"));

    if (blocked && blocked.length > 0) {
      setTimeSlots([]);
      return;
    }

    if (!tenant) return;
    const { data } = await supabase
      .from("availability")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("day_of_week", dayOfWeek)
      .eq("enabled", true)
      .single();

    if (data) {
      setTimeSlots(generateTimeSlots(data as Availability));
    } else {
      setTimeSlots([]);
    }
  };

  const fetchDisabledSlots = async () => {
    if (!selectedDate || !tenant) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { data } = await supabase
      .from("appointments")
      .select("time")
      .eq("tenant_id", tenant.id)
      .eq("date", dateStr)
      .neq("status", "cancelled");
    if (data) setDisabledSlots(data.map((a: { time: string }) => a.time));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !selectedServiceId) return;
    setLoading(true);
    setError("");

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const service = services.find((s) => s.id === selectedServiceId);

    const datesToCreate: string[] = [dateStr];

    if (recurring && recurringEndDate) {
      const end = new Date(recurringEndDate);
      let current = new Date(selectedDate);
      current.setDate(current.getDate() + 7);
      while (current <= end) {
        datesToCreate.push(format(current, "yyyy-MM-dd"));
        current.setDate(current.getDate() + 7);
      }
    }

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: dateStr,
        time: selectedTime,
        service: service?.name || "",
        service_id: selectedServiceId,
        notes: notes || null,
        recurring,
        recurring_end_date: recurring ? recurringEndDate || null : null,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      toast(data.error, "error");
      setLoading(false);
      return;
    }

    setSuccessCount(data.count);
    setSuccess(true);
    toast(
      `${data.count} turno${data.count > 1 ? "s" : ""} creado${data.count > 1 ? "s" : ""} correctamente`,
      "success"
    );
    setLoading(false);
    setTimeout(() => router.push("/dashboard"), 2500);
  };

  if (success) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="text-center">
          <BackButton href="/" />
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Turno{successCount > 1 ? "s" : ""} Reservado{successCount > 1 ? "s" : ""}</h2>
          <p className="text-white/50">
            {successCount > 1
              ? `${successCount} turnos creados correctamente`
              : `${selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: es })} a las ${selectedTime}`
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <BackButton href="/" />
        <div className="flex items-center gap-2 mb-8">
          <CalendarDays className="w-5 h-5 text-amber-400" />
          <h1 className="text-xl font-bold text-white">Reservar Turno</h1>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {["calendar", "form", "confirm"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  step === s
                    ? "bg-amber-500 text-white shadow-lg shadow-amber-500/25"
                    : "bg-white/5 text-white/40"
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && <div className="w-8 h-px bg-white/10" />}
            </div>
          ))}
        </div>

        {error && (
          <p className="mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        {step === "calendar" && (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <Calendar
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setSelectedTime(null);
              }}
              blockedDates={blockedDates}
            />
            {selectedDate && (
              <div className="mt-6 pt-6 border-t border-white/5">
                <TimeSlots
                  selectedTime={selectedTime}
                  onSelect={setSelectedTime}
                  disabledSlots={disabledSlots}
                  timeSlots={timeSlots}
                />
              </div>
            )}
            {selectedDate && selectedTime && (
              <button
                onClick={() => setStep("form")}
                className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/25"
              >
                Continuar
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            )}
          </div>
        )}

        {step === "form" && (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <div className="mb-6 p-4 bg-white/5 rounded-xl">
              <p className="text-sm text-white/50">Fecha y hora seleccionada:</p>
              <p className="text-white font-medium mt-1">
                {selectedDate && format(selectedDate, "EEEE, dd 'de' MMMM", { locale: es })} - {selectedTime}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">
                  Servicio
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all appearance-none"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.duration} min)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">
                  Notas (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contanos si tenés alguna observación..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all resize-none"
                />
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setRecurring(!recurring)}
                    className={`w-10 h-6 rounded-full transition-all shrink-0 ${
                      recurring ? "bg-amber-500" : "bg-white/10"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow transition-all ${
                        recurring ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <div>
                    <p className="text-sm font-medium text-white">Repetir semanalmente</p>
                    <p className="text-xs text-white/40">
                      Crear turnos automáticos todas las semanas
                    </p>
                  </div>
                </label>
                {recurring && (
                  <div className="mt-3 pl-[3.25rem]">
                    <label className="block text-xs font-medium text-white/50 mb-1">
                      Hasta
                    </label>
                    <input
                      type="date"
                      value={recurringEndDate}
                      onChange={(e) => setRecurringEndDate(e.target.value)}
                      min={selectedDate ? format(new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd") : undefined}
                      className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("calendar")}
                  className="flex-1 px-4 py-2.5 bg-white/5 text-white/70 rounded-xl font-medium hover:bg-white/10 hover:text-white transition-all border border-white/10"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ClipboardList className="w-4 h-4" />
                      Confirmar Turno
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
