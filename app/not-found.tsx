"use client";

import Link from "next/link";
import { Compass, Home, AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Main Glassmorphic Card */}
      <div className="relative max-w-md w-full bg-card/60 backdrop-blur-xl border border-border/60 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-500">
        {/* Glow accent */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent rounded-t-3xl" />

        {/* Icon Container */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center animate-bounce">
          <AlertCircle className="w-8 h-8" />
        </div>

        {/* Text Area */}
        <div className="space-y-2">
          <h1 className="text-6xl font-black tracking-widest bg-gradient-to-r from-primary via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-xl font-bold text-foreground">
            Halaman Tidak Ditemukan
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Oops! Halaman yang Anda cari tidak tersedia. Mungkin tautannya salah, atau halaman tersebut telah dipindahkan.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Compass className="w-4 h-4" />
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
