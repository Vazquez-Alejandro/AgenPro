"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import Calendar from "@/components/Calendar";
import TimeSlots from "@/components/TimeSlots";
import { CalendarDays, ClipboardList, ArrowLeft, CheckCircle } from "lucide-react";

const SERVICES = [
  "Consulta General",
  "Consulta de Especialidad",
  "Chequeo de Rutina",
  "Asesoría",
  "Otro",
];

export default function ReservarContent() {
  const [step, setStep] = useState<"calendar" | "form" | "confirm">("calendar");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [disabledSlots, setDisabledSlots] = useState<string[]>([]);
  const [service, setService] = useState(SERVICES[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  const fetchDisabledSlots = async () => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { data } = await supabase
      .from("appointments")
      .select("time")
      .eq("date", dateStr)
      .neq("status", "cancelled");
    if (data) setDisabledSlots(data.map((a: { time: string }) => a.time));
  };

  useEffect(() => {
    if (selectedDate) fetchDisabledSlots();
  }, [selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) return;
    setLoading(true);
    setError("");

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { error: insertError } = await supabase.from("appointments").insert({
      date: dateStr,
      time: selectedTime,
      service,
      notes: notes || null,
      status: "confirmed",
    });

    if (insertError) {
      setError(
        insertError.message.includes("unique")
          ? "Este horario ya fue reservado"
          : insertError.message
      );
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  if (success) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Turno Reservado</h2>
          <p className="text-white/50">
            {selectedDate &&
              format(selectedDate, "dd 'de' MMMM", { locale: es })}{" "}
            a las {selectedTime}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <CalendarDays className="w-5 h-5 text-emerald-400" />
          <h1 className="text-xl font-bold text-white">Reservar Turno</h1>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {["calendar", "form", "confirm"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  step === s
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
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
            />
            {selectedDate && (
              <div className="mt-6 pt-6 border-t border-white/5">
                <TimeSlots
                  selectedTime={selectedTime}
                  onSelect={setSelectedTime}
                  disabledSlots={disabledSlots}
                />
              </div>
            )}
            {selectedDate && selectedTime && (
              <button
                onClick={() => setStep("form")}
                className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/25"
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
                {selectedDate &&
                  format(selectedDate, "EEEE, dd 'de' MMMM", {
                    locale: es,
                  })}{" "}
                - {selectedTime}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">
                  Servicio
                </label>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all appearance-none"
                >
                  {SERVICES.map((s) => (
                    <option key={s} value={s} className="bg-[#1a1a1a]">
                      {s}
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
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all resize-none"
                />
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
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
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
