"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Availability, Service } from "@/types";
import { DAY_NAMES } from "@/types";
import { Save, Loader2, Settings2 } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";

const EMPTY_DAY_TEMPLATE = {
  enabled: false,
  start_time: "09:00",
  end_time: "18:00",
  slot_duration: 30,
};

export default function AvailabilityContent() {
  const [allAvailability, setAllAvailability] = useState<Availability[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [filterByService, setFilterByService] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = useRef(createClient()).current;
  const { tenant } = useTenant();

  useEffect(() => {
    if (tenant) {
      setFilterByService(tenant.filter_by_service);
      fetchData();
    }
  }, [tenant]);

  const fetchData = async () => {
    if (!tenant) { setLoading(false); return; }

    const [availResult, servicesResult] = await Promise.all([
      supabase
        .from("availability")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("day_of_week"),
      supabase
        .from("services")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("active", true)
        .order("name"),
    ]);

    if (availResult.data) setAllAvailability(availResult.data);
    if (servicesResult.data) {
      setServices(servicesResult.data);
      if (servicesResult.data.length > 0 && !selectedServiceId) {
        setSelectedServiceId(servicesResult.data[0].id);
      }
    }
    setLoading(false);
  };

  const getVisibleAvailability = (): Availability[] => {
    if (!filterByService) {
      return allAvailability.filter((a) => a.service_id === null);
    }
    return allAvailability.filter((a) => a.service_id === selectedServiceId);
  };

  const getOrCreateDayRows = (): Availability[] => {
    const visible = getVisibleAvailability();
    return DAY_NAMES.map((_, index) => {
      const existing = visible.find((a) => a.day_of_week === index);
      if (existing) return existing;
      return {
        id: `new-${index}`,
        tenant_id: tenant?.id ?? null,
        service_id: filterByService ? selectedServiceId : null,
        day_of_week: index,
        ...EMPTY_DAY_TEMPLATE,
      } as Availability;
    });
  };

  const toggleDay = (dayOfWeek: number) => {
    setAllAvailability((prev) => {
      const existing = prev.find(
        (a) =>
          a.day_of_week === dayOfWeek &&
          a.service_id === (filterByService ? selectedServiceId : null)
      );
      if (existing) {
        return prev.map((a) =>
          a.id === existing.id ? { ...a, enabled: !a.enabled } : a
        );
      }
      return [
        ...prev,
        {
          id: `new-${dayOfWeek}`,
          tenant_id: tenant?.id ?? null,
          service_id: filterByService ? selectedServiceId : null,
          day_of_week: dayOfWeek,
          ...EMPTY_DAY_TEMPLATE,
          enabled: true,
        } as Availability,
      ];
    });
  };

  const updateField = (
    dayOfWeek: number,
    field: "start_time" | "end_time" | "slot_duration",
    value: string | number
  ) => {
    setAllAvailability((prev) => {
      const existing = prev.find(
        (a) =>
          a.day_of_week === dayOfWeek &&
          a.service_id === (filterByService ? selectedServiceId : null)
      );
      if (existing) {
        return prev.map((a) =>
          a.id === existing.id ? { ...a, [field]: value } : a
        );
      }
      return [
        ...prev,
        {
          id: `new-${dayOfWeek}`,
          tenant_id: tenant?.id ?? null,
          service_id: filterByService ? selectedServiceId : null,
          day_of_week: dayOfWeek,
          ...EMPTY_DAY_TEMPLATE,
          [field]: value,
        } as Availability,
      ];
    });
  };

  const handleSave = async () => {
    if (!tenant) return;
    setSaving(true);

    const rows = getOrCreateDayRows();
    for (const day of rows) {
      const isExisting = !day.id.startsWith("new-");
      await supabase.from("availability").upsert({
        ...(isExisting ? { id: day.id } : {}),
        tenant_id: tenant.id,
        service_id: filterByService ? selectedServiceId : null,
        day_of_week: day.day_of_week,
        enabled: day.enabled,
        start_time: day.start_time,
        end_time: day.end_time,
        slot_duration: day.slot_duration,
      });
    }

    await supabase
      .from("tenants")
      .update({ filter_by_service: filterByService })
      .eq("id", tenant.id);

    await fetchData();
    setSaving(false);
  };

  const dayRows = getOrCreateDayRows();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
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
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Guardar
        </button>
      </div>

      <div className="flex items-center gap-4 mb-6 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
        <Settings2 className="w-5 h-5 text-white/40 shrink-0" />
        <div className="flex items-center gap-3 flex-1">
          <span className="text-sm text-white/60">Filtrar disponibilidad por servicio</span>
          <button
            onClick={() => setFilterByService((prev) => !prev)}
            className={`relative w-11 h-6 rounded-full transition-all shrink-0 ${
              filterByService ? "bg-amber-500" : "bg-white/10"
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                filterByService ? "left-6" : "left-1"
              }`}
            />
          </button>
        </div>
        {filterByService && services.length > 0 && (
          <select
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 min-w-[180px]"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id} className="bg-gray-900">
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {filterByService && services.length === 0 && (
        <div className="text-center py-8 text-white/40 text-sm">
          No hay servicios activos para configurar disponibilidad.
        </div>
      )}

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
            {dayRows.map((day) => (
              <tr
                key={day.day_of_week}
                className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-3 px-4 text-white">{DAY_NAMES[day.day_of_week]}</td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => toggleDay(day.day_of_week)}
                    className={`w-10 h-6 rounded-full transition-all ${
                      day.enabled ? "bg-amber-500" : "bg-white/10"
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
                    className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-30"
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
                    className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-30"
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
                        parseInt(e.target.value) || 30
                      )
                    }
                    disabled={!day.enabled}
                    min={15}
                    max={240}
                    step={15}
                    className="w-20 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-30"
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
