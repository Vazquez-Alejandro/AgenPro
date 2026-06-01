"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackButton({ href }: { href?: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => (href ? router.push(href) : router.back())}
      className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-4"
    >
      <ArrowLeft className="w-4 h-4" />
      Volver
    </button>
  );
}
