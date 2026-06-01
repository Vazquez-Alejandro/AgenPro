"use client";

import { useState, useEffect, useRef } from "react";
import { format, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { createClient } from "@/lib/supabase/client";
import Calendar from "@/components/Calendar";
import TimeSlots from "@/components/TimeSlots";
import PaymentForm from "@/components/PaymentForm";
import BackButton from "@/components/BackButton";
import type { Service, Availability } from "@/types";
import {
  CalendarDays,
  ArrowLeft,
  CheckCircle,
  User,
  Mail,
  Phone,
  Scissors,
  CreditCard,
  LogIn,
  UserPlus,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { useLang } from "@/contexts/LangContext";
import { useTenant } from "@/contexts/TenantContext";
import Link from "next/link";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

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

function formatPrice(cents: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(cents / 100);
}

export default function TurnoContent() {
  const { t } = useLang();
  const [user, setUser] = useState<any | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [step, setStep] = useState<"calendar" | "form" | "payment" | "confirm">(
    "calendar"
  );
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
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const supabase = useRef(createClient()).current;
  const { toast } = useToast();
  const { tenant } = useTenant();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
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
    });
  }, []);

  const selectedService = services.find((s) => s.id === selectedServiceId);

  useEffect(() => {
    fetchServices();
    fetchBlockedDates();
    checkMPReturn();
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    loadTimeSlots();
    fetchDisabledSlots();
  }, [selectedDate]);

  const checkMPReturn = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mp_success") === "1") {
      toast(t.booking.success, "success");
      setSuccess(true);
    }
  };

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

  const goToPayment = async () => {
    if (!selectedService || selectedService.price <= 0) {
      createAppointment(null, "free");
      return;
    }
    setPaymentLoading(true);
    setError("");

    try {
      const res = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: selectedServiceId,
          service_name: selectedService.name,
          amount: selectedService.price,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al iniciar el pago");
        setPaymentLoading(false);
        return;
      }

      setClientSecret(data.clientSecret);
      setStep("payment");
    } catch {
      setError("Error de conexión");
    }
    setPaymentLoading(false);
  };

  const handleStripeSuccess = async (paymentIntentId: string) => {
    await createAppointment(paymentIntentId, "stripe");
  };

  const handleMPPay = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/mercadopago-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_name: selectedService?.name,
          amount: selectedService?.price,
          client_name: clientName.trim(),
          client_email: clientEmail.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.initPoint) {
        setError(data.error || "Error al conectar con Mercado Pago");
        setLoading(false);
        return;
      }

      const dateStr = format(selectedDate!, "yyyy-MM-dd");
      const appRes = await fetch("/api/public-appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr,
          time: selectedTime,
          service_id: selectedServiceId,
          client_name: clientName.trim(),
          client_email: clientEmail.trim(),
          client_phone: clientPhone.trim() || null,
          payment_intent_id: data.preferenceId,
          payment_method: "mercadopago",
        }),
      });

      if (!appRes.ok) {
        const err = await appRes.json();
        toast(err.error || "Error al crear el turno", "error");
        setLoading(false);
        return;
      }

      window.location.href = data.initPoint;
    } catch {
      setError("Error de conexión");
    }
    setLoading(false);
  };

  const createAppointment = async (
    paymentIntentId: string | null,
    paymentMethod: string
  ) => {
    setLoading(true);
    setError("");

    const dateStr = format(selectedDate!, "yyyy-MM-dd");

    const res = await fetch("/api/public-appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: dateStr,
        time: selectedTime,
        service_id: selectedServiceId,
        user_id: user?.id,
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim() || null,
        payment_intent_id: paymentIntentId,
        payment_method: paymentMethod,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const msg =
        res.status === 429
          ? t.booking.errors.tooManyRequests
          : data.error || "Error al crear el turno";
      setError(msg);
      toast(msg, "error");
      setLoading(false);
      return;
    }

    setSuccess(true);
    toast(t.booking.success, "success");
    setLoading(false);
  };

  const stepNames = ["calendar", "form", "payment", "confirm"] as const;

  if (!authLoaded) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
        <div className="text-center max-w-sm">
          <BackButton href="/" />
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 mt-4">
            <UserPlus className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Reservá tu turno</h2>
          <p className="text-white/50 mb-6">
            Necesitás crear una cuenta o iniciar sesión para poder reservar.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/register-client"
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/25"
            >
              <UserPlus className="w-4 h-4" />
              Crear cuenta
            </Link>
            <Link
              href="/login"
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
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <BackButton href="/" />
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {t.booking.success}
          </h2>
          <p className="text-white/50">{t.booking.successDesc}</p>
          {selectedDate && (
            <p className="text-white/50 mt-1">
              {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: es })} a
              las {selectedTime}
            </p>
          )}
          <p className="text-sm text-white/30 mt-2">
            Te enviamos un resumen al{" "}
            <span className="text-white/50">{clientEmail}</span>
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
          <CalendarDays className="w-5 h-5 text-emerald-400" />
          <h1 className="text-xl font-bold text-white">{t.booking.title}</h1>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {stepNames.map((s, i) => (
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
              {i < stepNames.length - 1 && (
                <div className="w-8 h-px bg-white/10" />
              )}
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
                className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/25"
              >
                {t.booking.continue}
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            )}
          </div>
        )}

        {step === "form" && (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <div className="mb-6 p-4 bg-white/5 rounded-xl">
              <p className="text-sm text-white/50">{t.booking.dateTime}</p>
              <p className="text-white font-medium mt-1">
                {selectedDate &&
                  format(selectedDate, "EEEE, dd 'de' MMMM", {
                    locale: es,
                  })}{" "}
                - {selectedTime}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5" />
                  {t.booking.service}
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all appearance-none"
                >
                  {services.length === 0 && (
                    <option value="">
                      {t.booking.noServices}
                    </option>
                  )}
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.duration} min — {formatPrice(s.price)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {t.booking.name}
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={t.booking.namePlaceholder}
                  required
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {t.booking.email}
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder={t.booking.emailPlaceholder}
                  required
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  {t.booking.phone}
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder={t.booking.phonePlaceholder}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("calendar")}
                  className="flex-1 px-4 py-2.5 bg-white/5 text-white/70 rounded-xl font-medium hover:bg-white/10 hover:text-white transition-all border border-white/10"
                >
                  {t.booking.back}
                </button>
                <button
                  type="button"
                  onClick={goToPayment}
                  disabled={loading || !clientName.trim() || !clientEmail.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading || paymentLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      {t.booking.goToPayment}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "payment" && selectedService && clientSecret && (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <div className="mb-6 space-y-2">
              <p className="text-sm text-white/50">{t.booking.summary}</p>
              <div className="p-4 bg-white/5 rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">
                    {selectedService.name} ({selectedService.duration} min)
                  </span>
                  <span className="text-white font-medium">
                    {formatPrice(selectedService.price)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">
                    {selectedDate &&
                      format(selectedDate, "EEEE, dd 'de' MMMM", {
                        locale: es,
                      })}
                  </span>
                  <span className="text-white">{selectedTime}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">{t.booking.name}</span>
                  <span className="text-white">{clientName}</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between">
                  <span className="text-white font-semibold">
                    {t.booking.total}
                  </span>
                  <span className="text-emerald-400 font-bold">
                    {formatPrice(selectedService.price)}
                  </span>
                </div>
              </div>
            </div>

            <Elements
              stripe={stripePromise}
              key={clientSecret}
              options={{ clientSecret }}
            >
              <PaymentForm
                clientSecret={clientSecret}
                amount={selectedService.price}
                serviceName={selectedService.name}
                onSuccess={handleStripeSuccess}
                onMPPay={handleMPPay}
              />
            </Elements>

            <button
              type="button"
              onClick={() => setStep("form")}
              className="mt-4 w-full px-4 py-2.5 bg-white/5 text-white/70 rounded-xl font-medium hover:bg-white/10 hover:text-white transition-all border border-white/10"
            >
              {t.booking.back}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
