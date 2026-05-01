"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Navbar } from "@/components/navbar";
import {
  Check,
  Wind,
  Droplets,
  Flame,
  Zap,
  TrendingUp,
  ArrowRight,
  Activity,
  Github,
  Linkedin,
  Instagram,
  Bell,
  BarChart3,
  Cpu,
  ChevronRight,
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
                  className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 hover:scale-105 transition-all flex items-center gap-2"
                >
                  Buka Dashboard <ArrowRight className="w-5 h-5" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 hover:scale-105 transition-all flex items-center gap-2"
                  >
                    Mulai Sekarang
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

          {/* Right Image — Enhanced Hero Visual */}
          <div className="relative lg:h-[600px] flex items-center justify-center animate-in slide-in-from-right-5 duration-700 delay-100">
            {/* Outer glow pulse rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[420px] h-[420px] rounded-full border border-primary/20 animate-ping [animation-duration:3s]" />
              <div className="absolute w-[360px] h-[360px] rounded-full border border-primary/15 animate-ping [animation-duration:4s] [animation-delay:1s]" />
            </div>

            {/* Rotating orbit ring */}
            <div className="absolute w-[480px] h-[480px] rounded-full border border-dashed border-primary/20 animate-[spin_20s_linear_infinite] pointer-events-none">
              {/* Orbit dot */}
              <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_2px_hsl(var(--primary)/0.6)]" />
            </div>
            {/* Counter-rotating orbit ring */}
            <div className="absolute w-[540px] h-[540px] rounded-full border border-dashed border-blue-400/10 animate-[spin_30s_linear_infinite_reverse] pointer-events-none">
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full bg-blue-400/60 shadow-[0_0_6px_2px_rgba(96,165,250,0.4)]" />
            </div>

            {/* Main glass card */}
            <div className="relative w-full max-w-[400px] aspect-square rounded-3xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 shadow-2xl flex items-center justify-center p-8 overflow-hidden group">
              {/* Inner radial glow */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.15)_0%,transparent_70%)] pointer-events-none" />

              {/* Scan-line shimmer */}
              <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                <div className="absolute -top-full left-0 w-full h-full bg-gradient-to-b from-transparent via-white/8 to-transparent animate-[shimmer_4s_ease-in-out_infinite]" />
              </div>

              {/* Corner accent dots */}
              <span className="absolute top-4 left-4 w-1.5 h-1.5 rounded-full bg-primary/60" />
              <span className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-primary/60" />
              <span className="absolute bottom-4 left-4 w-1.5 h-1.5 rounded-full bg-primary/40" />
              <span className="absolute bottom-4 right-4 w-1.5 h-1.5 rounded-full bg-primary/40" />

              {/* Device image */}
              <div className="relative z-10 transition-transform duration-700 group-hover:scale-105 group-hover:-translate-y-1 drop-shadow-2xl">
                <img
                  src="/images/design-mode/Cover.png"
                  alt="AirGuard Device"
                  className="w-full h-auto rounded-xl object-cover"
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
            </div>

            {/* Floating badge — Air Quality (top-left) */}
            <div
              className="absolute top-[12%] left-[-10px] p-3.5 bg-card/95 backdrop-blur-md rounded-2xl shadow-xl border border-border
                         animate-[floatY_4s_ease-in-out_infinite]"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-500/15 flex items-center justify-center text-green-500 ring-1 ring-green-500/30">
                  <Wind className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Air Quality
                  </p>
                  <p className="text-sm font-bold text-green-500">Excellent</p>
                </div>
              </div>
            </div>

            {/* Floating badge — PM 2.5 (bottom-right) */}
            <div
              className="absolute bottom-[12%] right-[-10px] p-3.5 bg-card/95 backdrop-blur-md rounded-2xl shadow-xl border border-border
                         animate-[floatY_5s_ease-in-out_infinite_1.5s]"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-500 ring-1 ring-blue-500/30">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    PM 2.5
                  </p>
                  <p className="text-sm font-bold text-foreground">12 µg/m³</p>
                </div>
              </div>
            </div>

            {/* Floating badge — Live indicator (top-right) */}
            <div
              className="absolute top-[28%] right-[-10px] lg:right-[20px] px-3 py-2 bg-card/95 backdrop-blur-md rounded-xl shadow-lg border border-border
                         animate-[floatY_6s_ease-in-out_infinite_0.8s]"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-xs font-semibold text-foreground">
                  Live
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FEATURES SECTION --- */}
      <section className="py-28 px-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(hsl(var(--foreground))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground))_1px,transparent_1px)] [background-size:40px_40px]" />
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16 space-y-4">
            <h3 className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-widest">
              <Zap className="w-3 h-3" /> Fitur Unggulan
            </h3>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground">
              Semua yang Anda Butuhkan,{" "}
              <span className="bg-gradient-to-r from-primary via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Dalam Satu Platform
              </span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
              Teknologi canggih yang dikemas dalam desain minimalis untuk
              kenyamanan maksimal.
            </p>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Card 1 — Real-Time Monitoring (large, spans 2 cols on lg) */}
            <FeatureCard
              index={1}
              icon={<Cpu className="w-6 h-6" />}
              iconBg="from-primary/20 to-blue-500/10"
              iconColor="text-primary"
              glowColor="group-hover:shadow-primary/20"
              title="Real-Time Monitoring"
              desc="Sensor presisi tinggi membaca PM2.5, PM10, CO, dan VOC setiap 2 detik untuk data yang selalu akurat dan terkini."
              tag="Core"
              tagColor="bg-primary/10 text-primary border-primary/20"
              className="lg:col-span-2"
              highlight
            />

            {/* Card 2 — Smart Alerts */}
            <FeatureCard
              index={2}
              icon={<Bell className="w-6 h-6" />}
              iconBg="from-orange-500/20 to-red-500/10"
              iconColor="text-orange-500"
              glowColor="group-hover:shadow-orange-500/15"
              title="Smart Alerts"
              desc="Notifikasi instan ke smartphone Anda ketika kualitas udara mencapai level tidak sehat."
              tag="Notifikasi"
              tagColor="bg-orange-500/10 text-orange-500 border-orange-500/20"
            />

            {/* Card 3 — Analisis Historis */}
            <FeatureCard
              index={3}
              icon={<BarChart3 className="w-6 h-6" />}
              iconBg="from-violet-500/20 to-purple-500/10"
              iconColor="text-violet-500"
              glowColor="group-hover:shadow-violet-500/15"
              title="Analisis Historis"
              desc="Lacak tren kualitas udara harian dan mingguan untuk memahami pola polusi di rumah Anda."
              tag="Analitik"
              tagColor="bg-violet-500/10 text-violet-500 border-violet-500/20"
            />

            {/* Card 4 — Remote Control (large, spans 2 cols on lg) */}
            <FeatureCard
              index={4}
              icon={<Activity className="w-6 h-6" />}
              iconBg="from-cyan-500/20 to-teal-500/10"
              iconColor="text-cyan-500"
              glowColor="group-hover:shadow-cyan-500/15"
              title="Remote Control"
              desc="Kendalikan pergerakan device dari jarak jauh untuk memeriksa kualitas udara di ruangan berbeda tanpa harus berpindah tempat."
              tag="IoT"
              tagColor="bg-cyan-500/10 text-cyan-500 border-cyan-500/20"
              className="lg:col-span-2"
            />
          </div>
        </div>
      </section>

      {/* --- FILTER TECH --- */}
      <section className="py-28 px-4 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/30 via-background to-secondary/10" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          {/* Diagonal light streak */}
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px]" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-widest">
              <Wind className="w-3 h-3" /> Sistem Filtrasi
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground">
              Teknologi Filter{" "}
              <span className="bg-gradient-to-r from-primary via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                3-in-1
              </span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
              Tiga lapisan perlindungan bekerja bersama untuk memastikan setiap
              partikel berbahaya tersaring sempurna.
            </p>
          </div>

          {/* Airflow diagram — horizontal on lg, vertical on mobile */}
          <div className="flex flex-col lg:flex-row items-stretch gap-0">
            {/* Inlet label */}
            <div className="hidden lg:flex flex-col items-center justify-center pr-4 shrink-0">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest">
                  <span className="w-8 h-px bg-border" />
                  Udara Kotor
                </div>
                <div className="flex gap-1">
                  {["PM10", "CO", "VOC"].map((p) => (
                    <span
                      key={p}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20 font-medium"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Filter cards + connectors */}
            <div className="flex-1 flex flex-col lg:flex-row items-stretch gap-0">
              <FilterCard
                layer={1}
                icon={<Wind className="w-7 h-7" />}
                iconGradient="from-amber-500/20 to-orange-500/10"
                iconColor="text-amber-500"
                accentColor="border-amber-500/30"
                glowColor="amber-500"
                title="Pre-Filter"
                subtitle="Lapisan Pertama"
                desc="Menangkap partikel besar seperti debu kasar, rambut, dan bulu hewan peliharaan sebelum masuk ke filter utama."
                efficiency={85}
                efficiencyLabel="85%"
                life="3 Bulan"
                captures={["Debu Kasar", "Rambut", "Bulu Hewan"]}
              />

              {/* Connector */}
              <div className="flex lg:flex-col items-center justify-center px-2 py-4 lg:py-0 shrink-0">
                <div className="flex lg:flex-col items-center gap-1 text-primary/40">
                  <div className="w-6 h-px lg:w-px lg:h-6 bg-gradient-to-r lg:bg-gradient-to-b from-transparent to-primary/40" />
                  <ChevronRight className="w-4 h-4 lg:rotate-90 shrink-0" />
                  <div className="w-6 h-px lg:w-px lg:h-6 bg-gradient-to-r lg:bg-gradient-to-b from-primary/40 to-transparent" />
                </div>
              </div>

              <FilterCard
                layer={2}
                icon={<Droplets className="w-7 h-7" />}
                iconGradient="from-blue-500/20 to-cyan-500/10"
                iconColor="text-blue-500"
                accentColor="border-blue-500/30"
                glowColor="blue-500"
                title="HEPA Filter"
                subtitle="Lapisan Kedua"
                desc="Inti filtrasi medis yang menyaring 99.97% partikel hingga ukuran 0.3 mikron, termasuk bakteri dan spora jamur."
                efficiency={99.9}
                efficiencyLabel="99.97%"
                life="12 Bulan"
                captures={["PM2.5", "Bakteri", "Spora Jamur"]}
                featured
              />

              {/* Connector */}
              <div className="flex lg:flex-col items-center justify-center px-2 py-4 lg:py-0 shrink-0">
                <div className="flex lg:flex-col items-center gap-1 text-primary/40">
                  <div className="w-6 h-px lg:w-px lg:h-6 bg-gradient-to-r lg:bg-gradient-to-b from-transparent to-primary/40" />
                  <ChevronRight className="w-4 h-4 lg:rotate-90 shrink-0" />
                  <div className="w-6 h-px lg:w-px lg:h-6 bg-gradient-to-r lg:bg-gradient-to-b from-primary/40 to-transparent" />
                </div>
              </div>

              <FilterCard
                layer={3}
                icon={<Flame className="w-7 h-7" />}
                iconGradient="from-emerald-500/20 to-teal-500/10"
                iconColor="text-emerald-500"
                accentColor="border-emerald-500/30"
                glowColor="emerald-500"
                title="Carbon Filter"
                subtitle="Lapisan Ketiga"
                desc="Karbon aktif menetralisir bau tidak sedap, asap rokok, dan gas berbahaya (VOCs) yang lolos dari filter sebelumnya."
                efficiency={95}
                efficiencyLabel="Anti-Odor"
                life="6 Bulan"
                captures={["VOC", "Asap Rokok", "Bau Kimia"]}
              />
            </div>

            {/* Outlet label */}
            <div className="hidden lg:flex flex-col items-center justify-center pl-4 shrink-0">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-green-500">
                  Udara Bersih
                  <span className="w-8 h-px bg-green-500/40" />
                </div>
                <div className="flex gap-1">
                  {["99.97%", "Pure"].map((p) => (
                    <span
                      key={p}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 border border-green-500/20 font-medium"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom stat bar */}
          <div className="mt-12 grid grid-cols-3 gap-4 p-6 rounded-2xl bg-card/40 border border-border backdrop-blur-sm">
            {[
              {
                label: "Efisiensi Gabungan",
                value: "99.97%",
                color: "text-primary",
              },
              {
                label: "Partikel Tersaring",
                value: "0.3 µm",
                color: "text-blue-500",
              },
              {
                label: "Masa Pakai Terpanjang",
                value: "12 Bulan",
                color: "text-emerald-500",
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className={`text-2xl md:text-3xl font-black ${color}`}>
                  {value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- METRICS GRID --- */}
      <section className="py-28 px-4 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute inset-0 opacity-[0.025] bg-[linear-gradient(hsl(var(--foreground))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground))_1px,transparent_1px)] [background-size:40px_40px]" />
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-widest">
              <Activity className="w-3 h-3" /> Sensor Parameter
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground">
              Apa yang{" "}
              <span className="bg-gradient-to-r from-primary via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Kami Pantau
              </span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
              Empat parameter kunci kualitas udara dipantau secara simultan
              berdasarkan standar WHO.
            </p>
          </div>

          {/* Metrics grid — 2 large + 2 small bento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SensorMetric
              title="PM 2.5"
              unit="μg/m³"
              desc="Partikel Halus"
              detail="Partikel berdiameter ≤2.5 mikron yang dapat menembus paru-paru dan masuk ke aliran darah."
              limit="≤ 5"
              safeValue={5}
              exampleValue={12}
              color="text-blue-500"
              iconBg="from-blue-500/20 to-cyan-500/10"
              accentBorder="border-blue-500/30"
              riskLevel="Sedang"
              riskColor="text-amber-500"
              riskBg="bg-amber-500/10 border-amber-500/20"
              sources={["Kendaraan", "Industri", "Pembakaran"]}
            />
            <SensorMetric
              title="PM 10"
              unit="μg/m³"
              desc="Partikel Debu"
              detail="Partikel berdiameter ≤10 mikron yang dapat terhirup dan mengiritasi saluran pernapasan."
              limit="≤ 15"
              safeValue={15}
              exampleValue={28}
              color="text-cyan-500"
              iconBg="from-cyan-500/20 to-teal-500/10"
              accentBorder="border-cyan-500/30"
              riskLevel="Tinggi"
              riskColor="text-red-500"
              riskBg="bg-red-500/10 border-red-500/20"
              sources={["Debu Jalan", "Konstruksi", "Pertanian"]}
            />
            <SensorMetric
              title="CO"
              unit="ppm"
              desc="Karbon Monoksida"
              detail="Gas tidak berwarna dan tidak berbau yang sangat berbahaya, menghambat pengikatan oksigen dalam darah."
              limit="≤ 7"
              safeValue={7}
              exampleValue={3}
              color="text-red-500"
              iconBg="from-red-500/20 to-orange-500/10"
              accentBorder="border-red-500/30"
              riskLevel="Aman"
              riskColor="text-green-500"
              riskBg="bg-green-500/10 border-green-500/20"
              sources={["Kendaraan", "Kompor Gas", "Generator"]}
            />
            <SensorMetric
              title="VOC"
              unit="ppm"
              desc="Senyawa Organik Volatil"
              detail="Senyawa kimia organik yang mudah menguap dari cat, furnitur, dan produk pembersih rumah tangga."
              limit="≤ 5"
              safeValue={5}
              exampleValue={2}
              color="text-green-500"
              iconBg="from-green-500/20 to-emerald-500/10"
              accentBorder="border-green-500/30"
              riskLevel="Aman"
              riskColor="text-green-500"
              riskBg="bg-green-500/10 border-green-500/20"
              sources={["Cat", "Furnitur", "Pembersih"]}
            />
          </div>

          {/* WHO note */}
          <p className="text-center text-xs text-muted-foreground mt-8 flex items-center justify-center gap-1.5">
            <span className="inline-block w-4 h-px bg-border" />
            Batas aman berdasarkan panduan kualitas udara WHO 2021
            <span className="inline-block w-4 h-px bg-border" />
          </p>
        </div>
      </section>

      {/* --- CTA --- */}
      <section className="py-28 px-4 relative overflow-hidden">
        {/* Outer ambient glow */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-4xl mx-auto relative">
          {/* Orbit rings behind card */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
            <div className="w-[700px] h-[700px] rounded-full border border-dashed border-primary/10 animate-[spin_40s_linear_infinite]">
              <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary/40 shadow-[0_0_6px_2px_hsl(var(--primary)/0.3)]" />
            </div>
            <div className="absolute w-[560px] h-[560px] rounded-full border border-dashed border-primary/8 animate-[spin_30s_linear_infinite_reverse]">
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-400/50" />
            </div>
          </div>

          {/* Main card */}
          <div className="relative rounded-3xl overflow-hidden border border-primary/20 shadow-2xl shadow-primary/10">
            {/* Card background layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-card/80 to-secondary/20 backdrop-blur-xl" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(var(--primary)/0.2)_0%,transparent_65%)]" />
            {/* Shimmer */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-full left-0 w-full h-full bg-gradient-to-b from-transparent via-white/5 to-transparent animate-[shimmer_6s_ease-in-out_infinite]" />
            </div>
            {/* Top glow line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

            <div className="relative z-10 px-8 py-16 md:px-16 text-center space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-semibold uppercase tracking-widest">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                Mulai Sekarang
              </div>

              {/* Headline */}
              <div className="space-y-4">
                <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">
                  Siap Untuk{" "}
                  <span className="bg-gradient-to-r from-primary via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    Udara Lebih Bersih?
                  </span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  Jangan tunggu sampai kesehatan keluarga terganggu. Mulai
                  pantau kualitas udara rumah Anda hari ini real-time, akurat,
                  dan mudah digunakan.
                </p>
              </div>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <Link
                  href={user ? "/dashboard" : "/login"}
                  className="group/btn inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold rounded-full
                    bg-primary text-primary-foreground shadow-lg shadow-primary/30
                    hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/40 hover:scale-105
                    transition-all duration-300"
                >
                  {user ? "Buka Dashboard Saya" : "Bergabung Sekarang"}
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300" />
                </Link>

                {!user && (
                  <Link
                    href="/home#features"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold rounded-full
                      border border-border bg-background/50 text-foreground backdrop-blur-sm
                      hover:bg-card/80 hover:border-primary/40 hover:text-primary
                      transition-all duration-300"
                  >
                    Pelajari Lebih Lanjut
                  </Link>
                )}
              </div>
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
                  className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                >
                  <Github className="w-4 h-4" />
                </Link>
                <Link
                  href="https://www.linkedin.com/in/arizal-anshori-888b6b241/"
                  className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                >
                  <Linkedin className="w-4 h-4" />
                </Link>
                <Link
                  href="https://www.instagram.com/kyrazz26_"
                  className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                >
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
  index,
  icon,
  iconBg,
  iconColor,
  glowColor,
  title,
  desc,
  tag,
  tagColor,
  className = "",
  highlight = false,
}: {
  index: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  glowColor: string;
  title: string;
  desc: string;
  tag: string;
  tagColor: string;
  className?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`group relative p-7 rounded-3xl border backdrop-blur-sm transition-all duration-500
        hover:-translate-y-1.5 hover:shadow-2xl ${glowColor}
        ${
          highlight
            ? "bg-gradient-to-br from-primary/10 via-card/60 to-card/40 border-primary/30 hover:border-primary/50"
            : "bg-card/40 border-border hover:border-primary/30 hover:bg-card/70"
        } ${className}`}
    >
      {/* Top glow line on hover */}
      <div className="absolute inset-x-0 top-0 h-px rounded-t-3xl bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Step number */}
      <span className="absolute top-5 right-6 text-5xl font-black text-foreground/[0.04] select-none leading-none">
        0{index}
      </span>

      <div className="flex items-start justify-between mb-5">
        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${iconBg} flex items-center justify-center ${iconColor}
            ring-1 ring-white/10 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}
        >
          {icon}
        </div>

        {/* Tag */}
        <span
          className={`text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border ${tagColor}`}
        >
          {tag}
        </span>
      </div>

      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed text-sm">{desc}</p>
    </div>
  );
}

function FilterCard({
  layer,
  icon,
  iconGradient,
  iconColor,
  accentColor,
  glowColor,
  title,
  subtitle,
  desc,
  efficiency,
  efficiencyLabel,
  life,
  captures,
  featured = false,
}: {
  layer: number;
  icon: React.ReactNode;
  iconGradient: string;
  iconColor: string;
  accentColor: string;
  glowColor: string;
  title: string;
  subtitle: string;
  desc: string;
  efficiency: number;
  efficiencyLabel: string;
  life: string;
  captures: string[];
  featured?: boolean;
}) {
  return (
    <div
      className={`group relative flex-1 flex flex-col p-7 rounded-3xl border backdrop-blur-sm transition-all duration-500
        hover:-translate-y-1.5 hover:shadow-2xl
        ${
          featured
            ? `bg-gradient-to-b from-card/80 to-card/50 ${accentColor} shadow-lg`
            : `bg-card/40 border-border hover:${accentColor}`
        }`}
    >
      {/* Featured glow */}
      {featured && (
        <div
          className={`absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08)_0%,transparent_70%)] pointer-events-none`}
        />
      )}

      {/* Top accent line */}
      <div
        className={`absolute inset-x-0 top-0 h-0.5 rounded-t-3xl bg-gradient-to-r from-transparent via-${glowColor}/60 to-transparent
        ${featured ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity duration-500`}
      />

      {/* Layer badge */}
      <div className="flex items-center justify-between mb-6">
        <span
          className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
            featured
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-muted/50 text-muted-foreground border-border"
          }`}
        >
          Layer {layer}
        </span>
        {featured && (
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/30">
            ★ Utama
          </span>
        )}
      </div>

      {/* Icon */}
      <div
        className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${iconGradient} flex items-center justify-center ${iconColor}
        ring-1 ring-white/10 mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}
      >
        {icon}
      </div>

      {/* Title */}
      <p className="text-xs text-muted-foreground font-medium mb-1">
        {subtitle}
      </p>
      <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">
        {desc}
      </p>

      {/* Captures tags */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {captures.map((c) => (
          <span
            key={c}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${iconColor} bg-current/5 border-current/20`}
            style={{ backgroundColor: "transparent" }}
          >
            <span className={iconColor}>{c}</span>
          </span>
        ))}
      </div>

      {/* Efficiency bar */}
      <div className="space-y-2 pt-5 border-t border-border">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground font-medium">Efisiensi</span>
          <span className={`font-bold ${iconColor}`}>{efficiencyLabel}</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${iconGradient.replace("/20", "/80").replace("/10", "/60")} transition-all duration-1000`}
            style={{ width: `${Math.min(efficiency, 100)}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-xs pt-1">
          <span className="text-muted-foreground">Masa Pakai</span>
          <span className="font-semibold text-foreground">{life}</span>
        </div>
      </div>
    </div>
  );
}

function SensorMetric({
  title,
  unit,
  desc,
  detail,
  limit,
  safeValue,
  exampleValue,
  color,
  iconBg,
  accentBorder,
  riskLevel,
  riskColor,
  riskBg,
  sources,
}: {
  title: string;
  unit: string;
  desc: string;
  detail: string;
  limit: string;
  safeValue: number;
  exampleValue: number;
  color: string;
  iconBg: string;
  accentBorder: string;
  riskLevel: string;
  riskColor: string;
  riskBg: string;
  sources: string[];
}) {
  const pct = Math.min((exampleValue / (safeValue * 2)) * 100, 100);
  const isSafe = exampleValue <= safeValue;

  return (
    <div
      className={`group relative p-7 rounded-3xl border bg-card/40 backdrop-blur-sm transition-all duration-500
        hover:-translate-y-1 hover:shadow-2xl hover:bg-card/70 ${accentBorder} hover:border-opacity-60`}
    >
      {/* Top accent line */}
      <div
        className={`absolute inset-x-0 top-0 h-0.5 rounded-t-3xl bg-gradient-to-r from-transparent ${color.replace("text-", "via-")}/50 to-transparent
        opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
      />

      {/* Header row */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-end gap-1.5 mb-1">
            <span className={`text-4xl font-black leading-none ${color}`}>
              {title}
            </span>
            <span className="text-xs text-muted-foreground mb-1 font-medium">
              {unit}
            </span>
          </div>
          <p className="text-sm font-semibold text-foreground">{desc}</p>
        </div>

        {/* Risk badge */}
        <span
          className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${riskBg} ${riskColor} shrink-0`}
        >
          {riskLevel}
        </span>
      </div>

      {/* Detail text */}
      <p className="text-xs text-muted-foreground leading-relaxed mb-5">
        {detail}
      </p>

      {/* Gauge bar */}
      <div className="mb-5">
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
          <span>0</span>
          <span className="font-semibold">
            Batas WHO: {limit} {unit}
          </span>
          <span>{safeValue * 2}+</span>
        </div>
        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
          {/* Safe zone marker */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-green-500/15 border-r border-green-500/40"
            style={{ width: "50%" }}
          />
          {/* Value bar */}
          <div
            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${iconBg.replace("/20", "/80").replace("/10", "/60")}`}
            style={{ width: `${pct}%` }}
          />
          {/* Current value marker */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-background ${color.replace("text-", "bg-")} shadow-sm transition-all duration-1000`}
            style={{ left: `calc(${pct}% - 5px)` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-[10px] text-muted-foreground">
            Contoh nilai saat ini
          </span>
          <span className={`text-sm font-bold ${color}`}>
            {exampleValue} {unit}
            <span
              className={`ml-1.5 text-[10px] font-semibold ${isSafe ? "text-green-500" : "text-red-500"}`}
            >
              {isSafe ? "✓ Aman" : "⚠ Melebihi"}
            </span>
          </span>
        </div>
      </div>

      {/* Sources */}
      <div className="pt-4 border-t border-border">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-semibold">
          Sumber Umum
        </p>
        <div className="flex flex-wrap gap-1.5">
          {sources.map((s) => (
            <span
              key={s}
              className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border"
            >
              {s}
            </span>
          ))}
        </div>
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
            <Link
              href={link.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
