"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Navbar } from "@/components/navbar";
import {
  Check,
  Wind,
  Droplets,
  Flame,
  Leaf,
  Zap,
  Shield,
  TrendingUp,
  ArrowRight,
  Activity,
  Twitter,
  Github,
  Linkedin,
  Instagram,
} from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30 overflow-x-hidden">
      <Navbar />

      {/* --- HERO SECTION --- */}
      <section className="relative pt-1 pb-32 px-4 overflow-hidden">
        {/* Animated Background Blobs (Efek Cahaya) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute top-[10%] right-[10%] w-[400px] h-[400px] bg-blue-400/10 rounded-full blur-[80px]" />
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-in slide-in-from-left-5 duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Sistem Monitoring Udara Pintar
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
                Udara Bersih untuk <br />
                <span className="bg-gradient-to-r from-primary via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Keluarga Sehat
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
                AIRGUARD membantu Anda memantau kualitas udara rumah secara
                real-time. Deteksi polutan berbahaya sebelum mereka membahayakan
                kesehatan Anda.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              {user ? (
                <Link
                  href="/dashboard"
                  className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 hover:scale-105 transition-all flex items-center gap-2">
                  Buka Dashboard <ArrowRight className="w-5 h-5" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 hover:scale-105 transition-all flex items-center gap-2">
                    Mulai Sekarang
                  </Link>
                  <Link
                    href="/login"
                    className="px-8 py-4 rounded-xl border border-border bg-card/50 hover:bg-muted text-foreground font-semibold transition-all hover:border-primary/50">
                    Lihat Demo
                  </Link>
                </>
              )}
            </div>

            {/* Trust Badges */}
            <div className="pt-4 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" /> 24/7 Monitoring
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" /> IoT Integrated
              </div>
            </div>
          </div>

          {/* Right Image (Glass Card Effect) */}
          <div className="relative lg:h-[600px] flex items-center justify-center animate-in slide-in-from-right-5 duration-700 delay-100">
            <div className="relative w-full max-w-lg aspect-square rounded-3xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 shadow-2xl flex items-center justify-center p-8 overflow-hidden group">
              {/* Placeholder untuk Gambar Alat - Diganti Icon Besar jika gambar belum ada */}
              {/* Ganti src dengan path gambar aslimu */}
              <div className="relative z-10 transition-transform duration-500 group-hover:scale-105">
                <img
                  src="/images/design-mode/Cover.png"
                  alt="AirGuard Device"
                  className="w-full h-auto rounded-xl shadow-lg object-cover"
                  // Fallback jika gambar tidak ada, pakai placeholder visual
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = "none";
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="flex flex-col items-center text-primary/50"><svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8"/></svg><span class="mt-4 font-medium">Device Preview</span></div>`;
                    }
                  }}
                />
              </div>

              {/* Floating UI Elements Decor */}
              <div className="absolute top-10 left-[-20px] p-4 bg-card/90 backdrop-blur-md rounded-2xl shadow-xl border border-border animate-bounce duration-3000">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                    <Wind className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Air Quality</p>
                    <p className="font-bold text-foreground">Excellent</p>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-10 right-[-20px] p-4 bg-card/90 backdrop-blur-md rounded-2xl shadow-xl border border-border animate-bounce duration-4000">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">PM 2.5</p>
                    <p className="font-bold text-foreground">12 µg/m³</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FEATURES SECTION --- */}
      <section className="py-24 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-2">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Fitur Unggulan
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Teknologi canggih yang dikemas dalam desain minimalis untuk
              kenyamanan maksimal.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Real-Time Monitoring"
              desc="Sensor presisi tinggi membaca PM2.5, PM10, CO, dan VOC setiap 2 detik untuk data akurat."
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Smart Alerts"
              desc="Notifikasi instan ke smartphone Anda ketika kualitas udara mencapai level tidak sehat."
            />
            <FeatureCard
              icon={<Activity className="w-6 h-6" />}
              title="Analisis Historis"
              desc="Lacak tren kualitas udara harian dan mingguan untuk memahami pola polusi di rumah."
            />
            <FeatureCard
              icon={<Wind className="w-6 h-6" />}
              title="Remote Control"
              desc="Kendalikan pergerakan device dari jarak jauh untuk memeriksa udara di ruangan berbeda."
            />
          </div>
        </div>
      </section>

      {/* --- FILTER TECH --- */}
      <section className="py-24 px-4 bg-secondary/20 border-y border-border/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
            Teknologi Filter 3-in-1
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <FilterCard
              icon={<Wind />}
              title="Pre-Filter"
              desc="Menangkap partikel besar seperti debu kasar, rambut, dan bulu hewan peliharaan."
              efficiency="85%"
              life="3 Bulan"
            />
            <FilterCard
              icon={<Droplets />}
              title="HEPA Filter"
              desc="Inti filtrasi medis yang menyaring 99.97% partikel hingga ukuran 0.3 mikron."
              efficiency="99.9%"
              life="12 Bulan"
            />
            <FilterCard
              icon={<Flame />}
              title="Activated Carbon Filter"
              desc="Menetralisir bau tidak sedap, asap rokok, dan gas berbahaya (VOCs)."
              efficiency="Anti-Odor"
              life="6 Bulan"
            />
          </div>
        </div>
      </section>

      {/* --- METRICS GRID --- */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
            Parameter Sensor
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SensorMetric
              title="PM 2.5"
              desc="Partikel Halus"
              limit="≤ 5 μg/m³"
              color="text-blue-500"
            />
            <SensorMetric
              title="PM 10"
              desc="Partikel Debu"
              limit="≤ 15 μg/m³"
              color="text-cyan-500"
            />
            <SensorMetric
              title="CO"
              desc="Karbon Monoksida"
              limit="≤ 7 ppm"
              color="text-red-500"
            />
            <SensorMetric
              title="VOC"
              desc="Senyawa Organik"
              limit="≤ 5 ppm"
              color="text-green-500"
            />
          </div>
        </div>
      </section>

      {/* --- CTA --- */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl p-12 text-center border border-primary/10 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#444cf7_1px,transparent_1px)] [background-size:16px_16px]" />

          <div className="relative z-10 space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Siap Untuk Udara Lebih Bersih?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Jangan tunggu sampai kesehatan keluarga terganggu. Mulai pantau
              kualitas udara rumah Anda hari ini.
            </p>
            <div className="pt-4">
              <Link
                href={user ? "/dashboard" : "/login"}
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 transition-all">
                {user ? "Buka Dashboard Saya" : "Bergabung Sekarang"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-card border-t border-border pt-16 pb-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/20">
                  AG
                </div>
                <span className="text-xl font-bold text-foreground">
                  AIRGUARD
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Solusi IoT terdepan untuk pemantauan kualitas udara indoor yang
                cerdas dan terintegrasi.
              </p>
            </div>

            {/* Social Media Platform */}
            <div className="col-span-1 md:col-span-1">
              <h3 className="text-lg font-bold text-foreground mb-4">
                Hubungi Kami
              </h3>
              <div className="flex gap-4">
                <Link
                  href="https://github.com/kyrazz2602"
                  className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300">
                  <Github className="w-4 h-4" />
                </Link>
                <Link
                  href="https://www.linkedin.com/in/arizal-anshori-888b6b241/"
                  className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300">
                  <Linkedin className="w-4 h-4" />
                </Link>
                <Link
                  href="https://www.instagram.com/kyrazz26_"
                  className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300">
                  <Instagram className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <FooterLinks
              title="Produk"
              links={[{ name: "Dashboard", href: "/dashboard" }]}
            />
            <FooterLinks
              title="Company"
              links={[{ name: "About", href: "/home" }]}
            />
          </div>

          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>
              &copy; {new Date().getFullYear()} AIRGUARD. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* --- SUB COMPONENTS (Agar kode utama lebih bersih) --- */

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <div className="group p-8 rounded-3xl bg-card/40 border border-border hover:border-primary/50 hover:bg-card/80 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 backdrop-blur-sm">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function FilterCard({ icon, title, desc, efficiency, life }: any) {
  return (
    <div className="p-6 rounded-2xl bg-background border border-border hover:border-primary/30 transition-colors">
      <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 min-h-[60px]">{desc}</p>
      <div className="space-y-2 border-t border-border pt-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Efisiensi</span>
          <span className="font-semibold text-foreground">{efficiency}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Masa Pakai</span>
          <span className="font-semibold text-foreground">{life}</span>
        </div>
      </div>
    </div>
  );
}

function SensorMetric({ title, desc, limit, color }: any) {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border text-center hover:bg-muted/50 transition-colors">
      <h3 className={`text-2xl font-bold mb-1 ${color}`}>{title}</h3>
      <p className="text-xs font-medium text-foreground mb-3">{desc}</p>
      <div className="inline-block px-3 py-1 rounded-full bg-background border border-border text-[10px] text-muted-foreground">
        WHO: {limit}
      </div>
    </div>
  );
}

interface LinkItem {
  name: string;
  href: string;
}

function FooterLinks({ title, links }: { title: string; links: LinkItem[] }) {
  return (
    <div>
      <h4 className="font-bold text-foreground mb-4">{title}</h4>
      <ul className="space-y-3 text-sm text-muted-foreground">
        {links.map((link, i) => (
          <li key={i}>
            <Link href={link.href} className="text-muted-foreground hover:text-foreground transition-colors">
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
