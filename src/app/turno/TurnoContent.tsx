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
  Eye,
  EyeOff,
  IdCard,
  Lock,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { useLang } from "@/contexts/LangContext";
import { useTenant } from "@/contexts/TenantContext";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

import { generateTimeSlots, formatPrice } from "@/lib/utils";

export default function TurnoContent() {
  const { t } = useLang();
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
  const [clientDni, setClientDni] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const supabase = useRef(createClient()).current;
  const { toast } = useToast();
  const { tenant } = useTenant();

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
    let query = supabase
      .from("availability")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("day_of_week", dayOfWeek)
      .eq("enabled", true);

    if (tenant.filter_by_service && selectedServiceId) {
      query = query.eq("service_id", selectedServiceId);
    } else {
      query = query.is("service_id", null);
    }

    const { data } = await query.single();

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
      .select("time, service_id")
      .eq("tenant_id", tenant.id)
      .eq("date", dateStr)
      .neq("status", "cancelled");

    const blocked: Set<string> = new Set((data || []).map((a: { time: string; service_id: string }) => a.time));

    if (data && tenant.features?.cleaning_time) {
      const allServices = await supabase.from("services").select("id, duration, cleaning_time");
      const svcMap = new Map<string, { duration: number; cleaning_time: number }>((allServices.data || []).map((s: { id: string; duration: number; cleaning_time: number }) => [s.id, { duration: s.duration, cleaning_time: s.cleaning_time }]));

      // Get slot duration from availability config
      const { data: avail } = await supabase
        .from("availability")
        .select("slot_duration")
        .eq("tenant_id", tenant.id)
        .eq("day_of_week", selectedDate.getDay())
        .single();
      const slotDur = avail?.slot_duration || 30;

      for (const apt of data) {
        const svcInfo = svcMap.get(apt.service_id);
        const aptDuration = svcInfo?.duration || 30;
        const svcCleaning = svcInfo?.cleaning_time || tenant.default_cleaning_time || 0;
        const aptStart = apt.time.split(":").map(Number);
        const aptMinutes = aptStart[0] * 60 + aptStart[1];
        const aptEnd = aptMinutes + aptDuration + svcCleaning;

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
      if (!res.ok || !data.clientSecret) {
        setError(data.error || "Error al procesar el pago");
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

      await createAppointment(data.payment_id, "mercadopago");
      window.location.href = data.initPoint;
    } catch {
      setError("Error de conexión");
      setLoading(false);
    }
  };

  const createAppointment = async (
    paymentIntentId: string | null,
    paymentMethod: string
  ) => {
    setLoading(true);
    setError("");

    // Register or login user
    let userId: string | null = null;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
    } else if (clientPassword) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: clientEmail,
        password: clientPassword,
      });
      if (!signUpError && data.user) {
        userId = data.user.id;
        // Save DNI and name in profiles
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: clientName.trim(),
          dni: clientDni.trim() || null,
          role: "client",
          is_admin: false,
        });
      }
    }

    const dateStr = format(selectedDate!, "yyyy-MM-dd");

    const res = await fetch("/api/public-appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: dateStr,
        time: selectedTime,
        service_id: selectedServiceId,
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim() || null,
        payment_intent_id: paymentIntentId,
        payment_method: paymentMethod,
        user_id: userId,
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

  if (success) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <BackButton href="/" />
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-amber-400" />
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
          <CalendarDays className="w-5 h-5 text-amber-400" />
          <h1 className="text-xl font-bold text-white">{t.booking.title}</h1>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {stepNames.map((s, i) => (
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
                className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/25"
              >
                Continuar
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            )}
          </div>
        )}

        {step === "form" && (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
            <button
              onClick={() => setStep("calendar")}
              className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>

            {services.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5" />
                  Servicio
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {formatPrice(s.price)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Nombre
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
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
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
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
                placeholder="Opcional"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
                <IdCard className="w-3.5 h-3.5" />
                DNI
              </label>
              <input
                type="text"
                value={clientDni}
                onChange={(e) => setClientDni(e.target.value)}
                placeholder="Opcional"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={clientPassword}
                  onChange={(e) => setClientPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-2.5 pr-10 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-white/30 mt-1">Opcional — creá tu cuenta para ver tus turnos</p>
            </div>

            {selectedService && selectedService.price > 0 && (
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <p className="text-sm text-white/50">Total a pagar</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {formatPrice(selectedService.price)}
                </p>
              </div>
            )}

            <button
              onClick={() => {
                if (!clientName.trim() || !clientEmail.trim()) {
                  setError("Completá nombre y email");
                  return;
                }
                if (clientPassword && clientPassword.length < 6) {
                  setError("La contraseña debe tener al menos 6 caracteres");
                  return;
                }
                goToPayment();
              }}
              disabled={loading || paymentLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || paymentLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {selectedService && selectedService.price > 0 ? (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Pagar y reservar
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Reservar turno
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        )}

        {step === "payment" && clientSecret && selectedService && (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <button
              onClick={() => setStep("form")}
              className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: "night",
                  variables: { colorPrimary: "#f59e0b" },
                },
              }}
            >
              <PaymentForm
                clientSecret={clientSecret}
                amount={selectedService.price}
                serviceName={selectedService.name}
                onSuccess={handleStripeSuccess}
                onMPPay={() => {}}
              />
            </Elements>
          </div>
        )}
      </div>
    </div>
  );
}
