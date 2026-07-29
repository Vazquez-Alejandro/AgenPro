"use client";

import { useState } from "react";
import { CreditCard, Landmark } from "lucide-react";
import {
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from "@stripe/react-stripe-js";
import { useLang } from "@/contexts/LangContext";

interface PaymentFormProps {
  clientSecret: string;
  amount: number;
  serviceName: string;
  onSuccess: (paymentIntentId: string) => void;
  onMPPay: () => void;
}

const inputClasses =
  "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all";

const elementOptions = {
  style: {
    base: {
      color: "#ededed",
      fontFamily: "inherit",
      fontSize: "16px",
      "::placeholder": { color: "rgba(255,255,255,0.3)" },
    },
    invalid: { color: "#f87171" },
  },
};

function formatPrice(cents: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(cents / 100);
}

export default function PaymentForm({
  clientSecret,
  amount,
  serviceName,
  onSuccess,
  onMPPay,
}: PaymentFormProps) {
  const { t } = useLang();
  const stripe = useStripe();
  const elements = useElements();
  const [method, setMethod] = useState<"card" | "mp">("card");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError("");

    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) {
      setError("Error al inicializar el formulario de pago");
      setLoading(false);
      return;
    }

    const { error: confirmError, paymentIntent } =
      await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumber,
        },
      });

    if (confirmError) {
      setError(confirmError.message || t.booking.payError);
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      onSuccess(paymentIntent.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white/5 rounded-xl">
        <p className="text-sm text-white/50">{t.booking.total}</p>
        <p className="text-2xl font-bold text-amber-400 mt-1">
          {formatPrice(amount)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMethod("card")}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all border ${
            method === "card"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          {t.booking.payWithCard}
        </button>
        <button
          type="button"
          onClick={() => setMethod("mp")}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all border ${
            method === "mp"
              ? "bg-[#00BFFF]/10 border-[#00BFFF]/30 text-[#00BFFF]"
              : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70"
          }`}
        >
          <Landmark className="w-4 h-4" />
          {t.booking.payWithMP}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {method === "card" ? (
        <form onSubmit={handleCardPayment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              {t.booking.cardNumber}
            </label>
            <div className={inputClasses}>
              <CardNumberElement options={elementOptions} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                Vencimiento
              </label>
              <div className={inputClasses}>
                <CardExpiryElement options={elementOptions} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                CVV
              </label>
              <div className={inputClasses}>
                <CardCvcElement options={elementOptions} />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!stripe || loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                {t.booking.payNow} — {formatPrice(amount)}
              </>
            )}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={onMPPay}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#00BFFF] text-white rounded-xl font-medium hover:bg-[#00BFFF]/90 transition-all shadow-lg shadow-[#00BFFF]/25"
        >
          <Landmark className="w-4 h-4" />
          {t.booking.payWithMP}
        </button>
      )}
    </div>
  );
}
