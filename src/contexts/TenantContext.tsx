"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tenant } from "@/types";

const TenantContext = createContext<{
  tenant: Tenant | null;
  loading: boolean;
}>({
  tenant: null,
  loading: true,
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    const detectTenant = async () => {
      try {
        const path = window.location.pathname;
        const slug = path.split("/")[1];

        const reserved = [
          "admin", "dashboard", "login", "register", "reservar",
          "turno", "api", "auth", "_not-found",
        ];

        if (slug && !reserved.includes(slug)) {
          const { data } = await supabase
            .from("tenants")
            .select("*")
            .eq("slug", slug)
            .single();

          if (data && !cancelled) {
            setTenant(data as Tenant);
            setLoading(false);
            return;
          }
        }

        const hasSession = document.cookie.includes("sb-");
        if (hasSession && !cancelled) {
          const userResult = await Promise.race([
            supabase.auth.getUser(),
            new Promise<{ data: { user: null } }>((resolve) =>
              setTimeout(() => resolve({ data: { user: null } }), 5000)
            ),
          ]);
          const { data: { user } } = userResult as { data: { user: any } };
          if (user && !cancelled) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("tenant_id")
              .eq("id", user.id)
              .single();

            if (profile?.tenant_id && !cancelled) {
              const { data: t } = await supabase
                .from("tenants")
                .select("*")
                .eq("id", profile.tenant_id)
                .single();

              if (t && !cancelled) {
                setTenant(t as Tenant);
                setLoading(false);
                return;
              }
            }
          }
        }
      } catch {
        // Error de conexión, continuar sin tenant
      }

      if (!cancelled) setLoading(false);
    };

    detectTenant();
    return () => { cancelled = true; };
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, loading }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);
