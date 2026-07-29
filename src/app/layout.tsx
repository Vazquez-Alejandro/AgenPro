import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { LangProvider } from "@/contexts/LangContext";
import { TenantProvider } from "@/contexts/TenantContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgenPro - Reserva de Turnos",
  description: "Sistema de reserva de turnos online para negocios",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-[#0a0a0a] text-[#ededed] light:bg-white light:text-[#171717] transition-colors">
        <ThemeProvider>
          <LangProvider>
            <ToastProvider>
              <TenantProvider>
                <Navbar />
                {children}
              </TenantProvider>
            </ToastProvider>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
