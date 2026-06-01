"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function BackButton({ href }: { href?: string }) {
  if (href) {
    return (
      <Link
        href={href}
        className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors mb-4 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </Link>
    );
  }

  return (
    <button
      onClick={() => window.history.back()}
      className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors mb-4 cursor-pointer"
    >
      <ArrowLeft className="w-4 h-4" />
      Volver
    </button>
  );
}
