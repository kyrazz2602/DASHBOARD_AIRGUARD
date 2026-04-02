"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "next-themes";
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
} from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // Menutup menu mobile saat pindah halaman
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
  }, []);

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
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                AG
              </div>
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

            {/* --- MOBILE MENU TOGGLE --- */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors z-50"
              aria-label="Toggle Menu">
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 animate-in spin-in-90 duration-200" />
              ) : (
                <Menu className="w-6 h-6 animate-in spin-in-90 duration-200" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* --- MOBILE MENU DROPDOWN --- */}
      {/* Overlay Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      

      {/* Menu Content */}
      <div
        className={`fixed inset-x-0 top-16 z-50 p-4 md:hidden transition-all duration-300 ease-in-out ${
          isMobileMenuOpen
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0 pointer-events-none"
        }`}>
        <div className="bg-card border border-border shadow-xl rounded-2xl overflow-hidden">
          <div className="p-4 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}>
                  <Icon className="w-5 h-5" />
                  {link.name}
                </Link>
              );
            })}
          </div>

          <div className="p-4 border-t border-border bg-muted/30">
            {/* Theme Toggle */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-medium"
                title="Toggle theme"
                aria-label="Toggle theme">
                {mounted && theme === "dark" ? (
                  <>
                    <Sun className="w-4 h-4" />
                    Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4" />
                    Dark Mode
                  </>
                )}
              </button>
            </div>
            
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user.displayName || user.email?.split("@")[0] || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors text-sm font-medium">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
                <LogIn className="w-4 h-4" />
                Sign In to Continue
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
