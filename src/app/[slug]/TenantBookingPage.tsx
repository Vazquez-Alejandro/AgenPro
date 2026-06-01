"use client";

import { useState, useEffect, useRef } from "react";
import { format, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import Calendar from "@/components/Calendar";
import TimeSlots from "@/components/TimeSlots";
import type { Service, Availability, Tenant } from "@/types";
import {
  CalendarDays,
  ArrowLeft,
  CheckCircle,
  User,
  Mail,
  Phone,
  Scissors,
  Clock,
  LogIn,
  UserPlus,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import Link from "next/link";

function generateTimeSlots(avail: Availability): string[] {
  const slots: string[] = [];
  const start = avail.start_time.split(":").map(Number);
  const end = avail.end_time.split(":").map(Number);
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  const duration = avail.slot_duration;
  for (let m = startMinutes; m + duration <= endMinutes; m += duration) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }
  return slots;
}

export default function TenantBookingPage({
  tenant,
}: {
  tenant: Tenant;
}) {
  const [user, setUser] = useState<any | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [step, setStep] = useState<"calendar" | "form" | "confirm">("calendar");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [disabledSlots, setDisabledSlots] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const supabase = useRef(createClient()).current;
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setAuthLoaded(true);
    }, 3000);

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (cancelled) return;
        clearTimeout(timeout);
        if (data?.user) {
          setUser(data.user);
          supabase
            .from("profiles")
            .select("full_name")
            .eq("id", data.user.id)
            .single()
            .then(({ data: profile }) => {
              if (profile?.full_name) setClientName(profile.full_name);
            });
          setClientEmail(data.user.email || "");
        }
        setAuthLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          clearTimeout(timeout);
          setAuthLoaded(true);
        }
      });

    return () => { cancelled = true; };
  }, []);

  const primaryColor = tenant.primary_color || "#10b981";

  useEffect(() => {
    fetchServices();
    fetchBlockedDates();
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    loadTimeSlots();
    fetchDisabledSlots();
  }, [selectedDate]);

  const fetchBlockedDates = async () => {
    const { data } = await supabase
      .from("blocked_dates")
      .select("date")
      .eq("tenant_id", tenant.id);
    if (data) setBlockedDates(data.map((b: { date: string }) => b.date));
  };

  const fetchServices = async () => {
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

  const loadTimeSlots = async () => {
    if (!selectedDate) return;
    const dayOfWeek = getDay(selectedDate);

    const { data: blocked } = await supabase
      .from("blocked_dates")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("date", format(selectedDate, "yyyy-MM-dd"));

    if (blocked && blocked.length > 0) {
      setTimeSlots([]);
      return;
    }

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
    if (!selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { data: appointments } = await supabase
      .from("appointments")
      .select("time, service_id")
      .eq("tenant_id", tenant.id)
      .eq("date", dateStr)
      .neq("status", "cancelled");

    const blocked: Set<string> = new Set((appointments || []).map((a) => a.time));

    if (appointments && appointments.length > 0) {
      const { data: svcs } = await supabase
        .from("services")
        .select("id, duration, cleaning_time")
        .eq("tenant_id", tenant.id);

      const { data: avail } = await supabase
        .from("availability")
        .select("slot_duration")
        .eq("tenant_id", tenant.id)
        .eq("day_of_week", getDay(selectedDate))
        .eq("enabled", true)
        .single();

      const slotDur = (avail as Availability | null)?.slot_duration || 60;

      for (const apt of appointments) {
        const aptMinutes = timeToMinutes(apt.time);
        const svc = svcs?.find((s) => s.id === apt.service_id);
        const aptDuration = svc?.duration || 60;
        const aptCleaning = svc?.cleaning_time || 0;
        const aptEnd = aptMinutes + aptDuration + aptCleaning;

        for (let m = aptMinutes; m < aptEnd; m += slotDur) {
          const h = Math.floor(m / 60);
          const min = m % 60;
          blocked.add(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
        }
      }
    }

    setDisabledSlots(Array.from(blocked));
  };

  function timeToMinutes(t: string): number {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !selectedServiceId) return;
    if (!clientName.trim() || !clientEmail.trim()) return;

    setLoading(true);
    setError("");

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const service = services.find((s) => s.id === selectedServiceId);

    const res = await fetch("/api/public-appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: dateStr,
        time: selectedTime,
        service_id: selectedServiceId,
        service_name: service?.name,
        user_id: user?.id,
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim() || null,
        tenant_id: tenant.id,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data.error || "Error al crear el turno";
      setError(msg);
      toast(msg, "error");
      setLoading(false);
      return;
    }

    setSuccess(true);
    toast("Turno reservado", "success");
    setLoading(false);
  };

  if (!authLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 mt-4">
            <UserPlus className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Reservá tu turno</h2>
          <p className="text-white/50 mb-6">
            Necesitás crear una cuenta o iniciar sesión para poder reservar en {tenant.name}.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href={`/register-client?tenant_id=${tenant.id}&redirect=/${tenant.slug}`}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/25"
            >
              <UserPlus className="w-4 h-4" />
              Crear cuenta
            </Link>
            <Link
              href={`/login?redirect=/${tenant.slug}`}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white/5 border border-white/10 text-white/70 rounded-xl font-medium hover:bg-white/10 transition-all"
            >
              <LogIn className="w-4 h-4" />
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <CheckCircle className="w-8 h-8" style={{ color: primaryColor }} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Turno Reservado</h2>
          {selectedDate && (
            <p className="text-white/50">
              {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: es })} a las {selectedTime}
            </p>
          )}
          <p className="text-sm text-white/30 mt-2">
            Te enviamos un resumen al <span className="text-white/50">{clientEmail}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {tenant.logo_url ? (
            <img src={tenant.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {tenant.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-white">{tenant.name}</h1>
            <p className="text-xs text-white/40">Reservá tu turno online</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-8">
          <CalendarDays className="w-5 h-5" style={{ color: primaryColor }} />
          <h1 className="text-xl font-bold text-white">Reservar Turno</h1>
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
                className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl font-medium transition-all shadow-lg"
                style={{ backgroundColor: primaryColor }}
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
                <label className="block text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5" />
                  Servicio
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 transition-all appearance-none"
                  style={{ outlineColor: primaryColor }}
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.duration} min)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Nombre
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Tu nombre completo"
                  required
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 transition-all"
                  style={{ outlineColor: primaryColor }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 transition-all"
                  style={{ outlineColor: primaryColor }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+54 11 1234 5678"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 transition-all"
                  style={{ outlineColor: primaryColor }}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("calendar")}
                  className="flex-1 px-4 py-2.5 bg-white/5 text-white/70 rounded-xl font-medium hover:bg-white/10 transition-all border border-white/10"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl font-medium transition-all shadow-lg disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
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
