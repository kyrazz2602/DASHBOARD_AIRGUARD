"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useSensorData } from "@/hooks/use-sensor-data";
import { getStatusLabel } from "@/lib/sensor-data";
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Info,
  User,
  LogIn,
  Sun,
  Moon,
  Bell,
  AlertTriangle,
  TriangleAlert,
  ShieldCheck,
} from "lucide-react";

export interface SensorAlert {
  name: string;
  value: number;
  status: string;
  unit: string;
  isAlert?: boolean;
}

interface NavbarProps {
  alerts?: SensorAlert[];
}

export function Navbar({ alerts }: NavbarProps = {}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Ambil data sensor secara internal jika tidak dilewatkan lewat prop alerts dan user login
  const { data: sensorData } = useSensorData(3000);

  const activeAlerts = useMemo(() => {
    if (alerts) return alerts;
    if (!user) return [];

    return [
      { name: "PM2.5", value: sensorData.pm25, type: "PM2_5" as const, unit: "μg/m³" },
      { name: "PM10", value: sensorData.pm10, type: "PM10" as const, unit: "μg/m³" },
      { name: "CO", value: sensorData.co, type: "CO" as const, unit: "ppm" },
      { name: "VOC", value: sensorData.voc, type: "VOC" as const, unit: "mg/m³" },
    ].map((param) => {
      const status = getStatusLabel(param.value, param.type);
      return {
        ...param,
        status,
        isAlert: status !== "Safe",
      };
    }).filter((c) => c.isAlert);
  }, [alerts, user, sensorData]);
  const [isScrolled, setIsScrolled] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Efek untuk mendeteksi scroll agar navbar berubah style saat di-scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [isMobileNotifDropdownOpen, setIsMobileNotifDropdownOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifDropdownOpen(false);
      }
      if (mobileNotifRef.current && !mobileNotifRef.current.contains(event.target as Node)) {
        setIsMobileNotifDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderDropdownContent = () => (
    <>
      <div className="p-4 border-b border-border/50 dark:border-white/5 bg-muted/20 flex items-center justify-between">
        <h4 className="font-extrabold text-[11px] text-foreground uppercase tracking-wider">
          Notifikasi Parameter
        </h4>
        {activeAlerts && activeAlerts.length > 0 ? (
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            {activeAlerts.length} Parameter Tinggi
          </span>
        ) : (
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            Normal
          </span>
        )}
      </div>

      <div className="p-2.5 max-h-72 overflow-y-auto space-y-1.5">
        {activeAlerts && activeAlerts.length > 0 ? (
          activeAlerts.map((alert) => (
            <div
              key={alert.name}
              className={cn(
                "flex items-center justify-between p-3 rounded-xl border transition-all duration-200",
                alert.status === "Danger"
                  ? "bg-rose-500/5 border-rose-500/15 text-rose-700 dark:text-rose-300"
                  : "bg-amber-500/5 border-amber-500/15 text-amber-700 dark:text-amber-300"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                  alert.status === "Danger"
                    ? "bg-rose-500/10 border-rose-500/20"
                    : "bg-amber-500/10 border-amber-500/20"
                )}>
                  {alert.status === "Danger" ? (
                    <TriangleAlert className="w-4 h-4 text-rose-500 animate-pulse" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-tight text-foreground text-left">
                    {alert.name}
                  </p>
                  <p className="text-[10px] opacity-70 mt-0.5 text-left">
                    {alert.status === "Danger" ? "Bahaya" : "Perhatian"}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-extrabold text-foreground tabular-nums">
                  {alert.value.toFixed(2)}
                </p>
                <p className="text-[9px] opacity-60 uppercase font-semibold">
                  {alert.unit}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <ShieldCheck className="w-8 h-8 text-emerald-500/60" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">Semua Parameter Aman</p>
              <p className="text-[10px] opacity-75">Kualitas udara berada di tingkat optimal.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
  const navLinks = [
    { name: "About", href: "/home", icon: Info },
    ...(user
      ? [{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard }]
      : []),
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 border-b ${
          isScrolled
            ? "bg-background/70 backdrop-blur-md border-border shadow-sm"
            : "bg-transparent border-transparent"
        }`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            {/* --- LOGO --- */}
            <Link href="/home" className="flex items-center gap-3 group">
              <img
                src="/Gemini_Generated_Image.png"
                alt="AirGuard Logo"
                className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform"
              />
              <h1 className="text-xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                AIRGUARD
              </h1>
            </Link>

            {/* --- DESKTOP NAVIGATION --- */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-medium transition-colors flex items-center gap-2 hover:text-primary ${
                      isActive
                        ? "text-primary font-bold"
                        : "text-muted-foreground"
                    }`}>
                    {link.name}
                  </Link>
                );
              })}

              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Toggle theme"
                aria-label="Toggle theme">
                {mounted && theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>


              {/* Notification Bell (Desktop) */}
              {user && (
                <div ref={notifRef} className="relative z-50 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
                    className={cn(
                      "relative p-2 rounded-lg transition-colors focus:outline-none active:scale-95",
                      activeAlerts.length > 0
                        ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 dark:text-amber-400 animate-[pulse_2.2s_infinite]"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                    title="Notifikasi"
                  >
                    <Bell className={cn("w-5 h-5", activeAlerts.length > 0 && "animate-[bounce_2s_infinite]")} />
                    {activeAlerts.length > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm shadow-red-500/30">
                        {activeAlerts.length}
                      </span>
                    )}
                  </button>

                  {isNotifDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-border/60 dark:border-white/10 bg-card/95 shadow-2xl backdrop-blur-md overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
                      {renderDropdownContent()}
                    </div>
                  )}
                </div>
              )}

              {/* Separator */}
              <div className="h-6 w-px bg-border/60" />

              {/* User Action */}
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="text-right hidden lg:block">
                    <p className="text-sm font-semibold text-foreground leading-none">
                      {user.displayName || user.email?.split("@")[0] || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {user.email}
                    </p>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                    title="Logout">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 transition-all active:scale-95">
                  Sign In
                </Link>
              )}
            </nav>

            {/* --- MOBILE THEME TOGGLE / ACTIONS --- */}
            <div className="md:hidden flex items-center gap-1">

              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Toggle theme"
                aria-label="Toggle theme"
              >
                {mounted && theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              {/* Notification Bell (Mobile) */}
              {user && (
                <div ref={mobileNotifRef} className="relative z-50 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsMobileNotifDropdownOpen(!isMobileNotifDropdownOpen)}
                    className={cn(
                      "relative p-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors focus:outline-none active:scale-95",
                      activeAlerts.length > 0
                        ? "bg-amber-500/10 text-amber-500 dark:text-amber-400 animate-[pulse_2.2s_infinite]"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                    title="Notifikasi"
                  >
                    <Bell className={cn("w-5 h-5", activeAlerts.length > 0 && "animate-[bounce_2s_infinite]")} />
                    {activeAlerts.length > 0 && (
                      <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm shadow-red-500/30">
                        {activeAlerts.length}
                      </span>
                    )}
                  </button>

                  {isMobileNotifDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm rounded-2xl border border-border/60 dark:border-white/10 bg-card/95 shadow-2xl backdrop-blur-md overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
                      {renderDropdownContent()}
                    </div>
                  )}
                </div>
              )}

              {!user && (
                <Link
                  href="/login"
                  className="p-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Sign In"
                >
                  <LogIn className="w-5 h-5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
