"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BlockedDate } from "@/types";
import { Plus, Trash2, Loader2 } from "lucide-react";

export default function BlockedDatesContent() {
  const [dates, setDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const supabase = useRef(createClient()).current;

  useEffect(() => {
    fetchDates();
  }, []);

  const fetchDates = async () => {
    const { data } = await supabase
      .from("blocked_dates")
      .select("*")
      .order("date");
    if (data) setDates(data);
    setLoading(false);
  };

  const addDate = async () => {
    if (!newDate) return;
    await supabase.from("blocked_dates").insert({
      date: newDate,
      reason: newReason || null,
    });
    setNewDate("");
    setNewReason("");
    fetchDates();
  };

  const deleteDate = async (id: string) => {
    await supabase.from("blocked_dates").delete().eq("id", id);
    fetchDates();
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
      <h1 className="text-2xl font-bold text-white mb-6">Días Bloqueados</h1>

      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1">
              Motivo
            </label>
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Feriado, capacitación..."
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-60"
            />
          </div>
          <button
            onClick={addDate}
            disabled={!newDate}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-400 transition-all disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left py-3 px-4 text-sm font-medium text-white/40">Fecha</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-white/40">Motivo</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-white/40">Acción</th>
            </tr>
          </thead>
          <tbody>
            {dates.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-white/30">
                  No hay días bloqueados
                </td>
              </tr>
            ) : (
              dates.map((d) => (
                <tr key={d.id} className="border-b border-white/5 last:border-0">
                  <td className="py-3 px-4 text-white">
                    {new Date(d.date + "T12:00:00").toLocaleDateString("es-AR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-3 px-4 text-white/60">{d.reason || "—"}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => deleteDate(d.id)}
                      className="p-2 text-white/30 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
