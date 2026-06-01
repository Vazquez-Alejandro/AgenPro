"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Availability } from "@/types";
import { DAY_NAMES } from "@/types";
import { Save, Loader2 } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";

export default function AvailabilityContent() {
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = useRef(createClient()).current;
  const { tenant } = useTenant();

  useEffect(() => {
    fetchAvailability();
  }, [tenant]);

  const fetchAvailability = async () => {
    if (!tenant) { setLoading(false); return; }
    const { data } = await supabase
      .from("availability")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("day_of_week");
    if (data) setAvailability(data);
    setLoading(false);
  };

  const toggleDay = async (day: Availability) => {
    setAvailability((prev) =>
      prev.map((d) =>
        d.day_of_week === day.day_of_week
          ? { ...d, enabled: !d.enabled }
          : d
      )
    );
  };

  const updateField = (
    dayIndex: number,
    field: "start_time" | "end_time" | "slot_duration",
    value: string | number
  ) => {
    setAvailability((prev) =>
      prev.map((d) =>
        d.day_of_week === dayIndex ? { ...d, [field]: value } : d
      )
    );
  };

  const handleSave = async () => {
    if (!tenant) return;
    setSaving(true);
    for (const day of availability) {
      await supabase.from("availability").upsert({
        id: day.id,
        tenant_id: tenant.id,
        day_of_week: day.day_of_week,
        enabled: day.enabled,
        start_time: day.start_time,
        end_time: day.end_time,
        slot_duration: day.slot_duration,
      });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Horarios Laborales</h1>
          <p className="text-white/50 mt-1">
            Configurá los días y horarios de atención
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Guardar
        </button>
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left py-3 px-4 text-sm font-medium text-white/40">Día</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-white/40">Disponible</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-white/40">Inicio</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-white/40">Fin</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-white/40">Duración (min)</th>
            </tr>
          </thead>
          <tbody>
            {availability.map((day) => (
              <tr
                key={day.day_of_week}
                className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-3 px-4 text-white">{DAY_NAMES[day.day_of_week]}</td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => toggleDay(day)}
                    className={`w-10 h-6 rounded-full transition-all ${
                      day.enabled ? "bg-emerald-500" : "bg-white/10"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow transition-all ${
                        day.enabled ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </td>
                <td className="py-3 px-4">
                  <input
                    type="time"
                    value={day.start_time}
                    onChange={(e) =>
                      updateField(day.day_of_week, "start_time", e.target.value)
                    }
                    disabled={!day.enabled}
                    className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-30"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="time"
                    value={day.end_time}
                    onChange={(e) =>
                      updateField(day.day_of_week, "end_time", e.target.value)
                    }
                    disabled={!day.enabled}
                    className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-30"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="number"
                    value={day.slot_duration}
                    onChange={(e) =>
                      updateField(
                        day.day_of_week,
                        "slot_duration",
                        parseInt(e.target.value) || 60
                      )
                    }
                    disabled={!day.enabled}
                    min={15}
                    max={240}
                    step={15}
                    className="w-20 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-30"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
