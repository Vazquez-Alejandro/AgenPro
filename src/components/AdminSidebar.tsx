"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Calendar,
  Clock,
  Ban,
  Scissors,
  Settings,
  UserX,
  Users,
  Menu,
  X,
} from "lucide-react";
import { useLang } from "@/contexts/LangContext";

export default function AdminSidebar({ tenantSlug }: { tenantSlug: string | null }) {
  const [open, setOpen] = useState(false);
  const { t } = useLang();

  const links = [
    { href: "/admin", label: t.admin.dashboard, icon: LayoutDashboard },
    { href: "/admin/agenda", label: t.admin.agenda, icon: Calendar },
    { href: "/admin/availability", label: t.admin.availability, icon: Clock },
    { href: "/admin/blocked-dates", label: t.admin.blockedDates, icon: Ban },
    { href: "/admin/blacklist", label: t.admin.blacklist, icon: UserX },
    { href: "/admin/services", label: t.admin.services, icon: Scissors },
    { href: "/admin/staff", label: t.admin.staffPage.title, icon: Users },
    { href: "/admin/settings", label: t.admin.settings, icon: Settings },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-3 left-3 z-50 md:hidden p-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-56 bg-[#0a0a0a] border-r border-white/5 p-4 space-y-1 overflow-y-auto z-40 transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:static md:shrink-0`}
      >
        <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wider px-3 mb-4 mt-10 md:mt-0">
          {t.nav.admin}
        </h2>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <link.icon className="w-4 h-4" />
            {link.label}
          </Link>
        ))}

        {tenantSlug && (
          <div className="border-t border-white/5 pt-3 mt-3">
            <a
              href={`/${tenantSlug}`}
              target="_blank"
              className="flex items-center gap-2 px-3 py-2 text-sm text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/5 rounded-lg transition-colors"
            >
              <Calendar className="w-4 h-4" />
              {t.admin.publicPage}
            </a>
          </div>
        )}
      </aside>
    </>
  );
}
