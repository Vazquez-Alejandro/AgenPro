"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BlacklistEntry } from "@/types";
import { Plus, Trash2, Loader2, Ban } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/contexts/ToastContext";
import { useLang } from "@/contexts/LangContext";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 10;

export default function BlacklistContent() {
  const { tenant } = useTenant();
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [page, setPage] = useState(1);
  const supabase = useRef(createClient()).current;
  const { toast } = useToast();
  const { t } = useLang();

  const fetchEntries = async () => {
    if (!tenant) return;
    const { data } = await supabase
      .from("client_blacklist")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("blocked_at", { ascending: false });
    if (data) setEntries(data as BlacklistEntry[]);
    setLoading(false);
  };

  useEffect(() => {
    if (tenant) fetchEntries();
  }, [tenant]);

  const addEntry = async () => {
    if (!phone && !email) {
      toast("Ingresá al menos un teléfono o email", "error");
      return;
    }
    if (!tenant) return;
    setAdding(true);

    const { error } = await supabase.from("client_blacklist").insert({
      tenant_id: tenant.id,
      phone: phone || null,
      email: email || null,
      reason: reason || null,
    });

    setAdding(false);
    if (error) {
      toast("Error al bloquear cliente", "error");
      return;
    }
    toast("Cliente bloqueado", "success");
    setPhone("");
    setEmail("");
    setReason("");
    fetchEntries();
  };

  const removeEntry = async (id: string) => {
    await supabase.from("client_blacklist").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    toast("Cliente desbloqueado", "success");
  };

  if (!tenant) {
    return <p className="text-white/50 text-center py-16">Cargando...</p>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Ban className="w-6 h-6 text-red-400" />
        {t.admin.blacklistPage.title}
      </h1>

      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
          {t.admin.blacklistPage.add}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Teléfono (ej: +541112345678)"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.admin.blacklistPage.email}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
          />
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t.admin.blacklistPage.reason}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
          />
        </div>
        <button
          onClick={addEntry}
          disabled={adding}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-all disabled:opacity-50"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {t.admin.blacklistPage.save}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-white/30 text-center py-12 text-sm">
          No hay clientes bloqueados todavía.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl p-4"
            >
              <div>
                <p className="text-sm text-white font-medium">
                  {entry.phone || entry.email || "—"}
                </p>
                <p className="text-xs text-white/40 mt-0.5">
                  {entry.reason || "Sin motivo"}
                </p>
              </div>
              <button
                onClick={() => removeEntry(entry.id)}
                className="text-white/20 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <Pagination
            page={page}
            totalPages={Math.ceil(entries.length / PAGE_SIZE)}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
