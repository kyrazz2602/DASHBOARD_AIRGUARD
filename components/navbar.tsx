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

            {/* --- MOBILE THEME TOGGLE / ACTIONS --- */}
            <div className="md:hidden flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Toggle theme"
                aria-label="Toggle theme"
              >
                {mounted && theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
              {!user && (
                <Link
                  href="/login"
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
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
