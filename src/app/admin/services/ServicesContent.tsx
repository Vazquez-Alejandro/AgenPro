"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Service } from "@/types";
import { Plus, Loader2, X, Clock } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/contexts/ToastContext";

import { formatPrice } from "@/lib/utils";

export default function ServicesContent() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDuration, setNewDuration] = useState(60);
  const [newPrice, setNewPrice] = useState(0);
  const [newCleaning, setNewCleaning] = useState(0);
  const supabase = useRef(createClient()).current;
  const { tenant } = useTenant();
  const { toast } = useToast();

  useEffect(() => {
    fetchServices();
  }, [tenant]);

  const fetchServices = async () => {
    if (!tenant) { setLoading(false); return; }
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("name");
    if (data) setServices(data);
    setLoading(false);
  };

  const toggleActive = async (service: Service) => {
    if (!tenant) return;
    await supabase
      .from("services")
      .update({ active: !service.active })
      .eq("id", service.id)
      .eq("tenant_id", tenant.id);
    fetchServices();
  };

  const addService = async () => {
    if (!newName.trim() || !tenant) return;
    await supabase.from("services").insert({
      name: newName.trim(),
      duration: newDuration,
      price: newPrice,
      cleaning_time: newCleaning,
      tenant_id: tenant.id,
    });
    setNewName("");
    setNewDuration(60);
    setNewPrice(0);
    setNewCleaning(0);
    fetchServices();
  };

  const deleteService = async (id: string) => {
    if (!tenant) return;
    await supabase.from("services").delete().eq("id", id).eq("tenant_id", tenant.id);
    fetchServices();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Servicios</h1>

      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Consulta General"
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 w-60"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1">
              Duración (min)
            </label>
            <input
              type="number"
              value={newDuration}
              onChange={(e) => setNewDuration(parseInt(e.target.value) || 60)}
              min={15}
              step={15}
              className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1">
              Precio ($)
            </label>
            <input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(parseInt(e.target.value) || 0)}
              min={0}
              step={100}
              className="w-28 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Limpieza (min)
            </label>
            <input
              type="number"
              value={newCleaning}
              onChange={(e) => setNewCleaning(parseInt(e.target.value) || 0)}
              min={0}
              max={60}
              className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <button
            onClick={addService}
            disabled={!newName.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-400 transition-all disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {services.length === 0 ? (
          <p className="text-white/30 text-center py-8">
            No hay servicios configurados
          </p>
        ) : (
          services.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl"
            >
                <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleActive(s)}
                  className={`w-10 h-6 rounded-full transition-all ${
                    s.active ? "bg-amber-500" : "bg-white/10"
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow transition-all ${
                      s.active ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
                <div>
                  <p className="text-white font-medium">{s.name}</p>
                  <p className="text-sm text-white/40">
                    {s.duration} min &middot; {formatPrice(s.price)}
                    {s.cleaning_time > 0 && ` &middot; +${s.cleaning_time}min limpieza`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => deleteService(s.id)}
                className="p-2 text-white/30 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
