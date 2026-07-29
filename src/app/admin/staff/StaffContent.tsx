"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";
import { Plus, Trash2, Loader2, Users } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/contexts/ToastContext";

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  staff: "Empleado",
  client: "Cliente",
};

export default function StaffContent() {
  const { tenant } = useTenant();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "staff">("staff");
  const [adding, setAdding] = useState(false);
  const supabase = useRef(createClient()).current;
  const { toast } = useToast();

  const fetchMembers = async () => {
    if (!tenant) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("tenant_id", tenant.id)
      .in("role", ["owner", "admin", "staff"])
      .order("created_at");
    if (data) setMembers(data as Profile[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [tenant]);

  const addMember = async () => {
    if (!newEmail.trim() || !tenant) return;
    setAdding(true);

    // Check if user exists
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", newEmail.trim())
      .maybeSingle();

    if (existingUser) {
      toast("Ya existe un usuario con ese email", "error");
      setAdding(false);
      return;
    }

    // Create a placeholder profile (actual user registration happens when they log in)
    const { error } = await supabase.from("profiles").insert({
      id: crypto.randomUUID(),
      tenant_id: tenant.id,
      full_name: newName.trim() || null,
      role: newRole,
      is_admin: newRole === "admin",
    });

    if (error) {
      toast("Error al agregar miembro", "error");
    } else {
      toast("Miembro agregado", "success");
      setNewEmail("");
      setNewName("");
      setNewRole("staff");
      fetchMembers();
    }
    setAdding(false);
  };

  const removeMember = async (id: string) => {
    if (!tenant) return;
    const member = members.find((m) => m.id === id);
    if (member?.role === "owner") {
      toast("No podés eliminar al propietario", "error");
      return;
    }
    await supabase
      .from("profiles")
      .update({ tenant_id: null, role: "client" })
      .eq("id", id);
    toast("Miembro eliminado del equipo", "success");
    fetchMembers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Users className="w-6 h-6 text-amber-400" />
        Equipo
      </h1>

      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3 mb-6">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
          Agregar miembro
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as "admin" | "staff")}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="staff">Empleado</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        <button
          onClick={addMember}
          disabled={adding || !newEmail.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-xl text-sm font-medium hover:bg-amber-500/30 transition-all disabled:opacity-50"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Agregar
        </button>
      </div>

      <div className="space-y-2">
        {members.length === 0 ? (
          <p className="text-white/30 text-center py-12 text-sm">
            No hay miembros en el equipo
          </p>
        ) : (
          members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl p-4"
            >
              <div>
                <p className="text-sm text-white font-medium">
                  {m.full_name || "Sin nombre"}
                </p>
                <p className="text-xs text-white/40 mt-0.5">
                  {ROLE_LABELS[m.role] || m.role}
                </p>
              </div>
              {m.role !== "owner" && (
                <button
                  onClick={() => removeMember(m.id)}
                  className="text-white/20 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
