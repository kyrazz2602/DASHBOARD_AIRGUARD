"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Home, LayoutDashboard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const items = [
    { label: "Home", icon: Home, path: "/home" },
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/60"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around px-2 py-1.5">
        {items.map(({ label, icon: Icon, path }) => {
          const active = pathname === path;
          return (
            <button
              key={path}
              onClick={() => router.push(path)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 min-w-[64px] min-h-[48px] py-2 px-4 rounded-2xl transition-all duration-200 active:scale-95",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {/* Active indicator pill */}
              {active && (
                <span className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-primary animate-in fade-in zoom-in-50 duration-300" />
              )}
              <Icon
                className={cn(
                  "w-5 h-5 transition-all duration-200",
                  active && "scale-110 drop-shadow-[0_0_4px_hsl(var(--primary)/0.4)]",
                )}
              />
              <span
                className={cn(
                  "text-[10px] leading-tight transition-all duration-200",
                  active ? "font-bold" : "font-semibold",
                )}
              >
                {label}
              </span>
            </button>
          );
        })}

        <button
          onClick={() => {
            logout();
            router.push("/home");
          }}
          className="relative flex flex-col items-center gap-0.5 min-w-[64px] min-h-[48px] py-2 px-4 rounded-2xl text-muted-foreground hover:text-destructive transition-all duration-200 active:scale-95"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-semibold leading-tight">Keluar</span>
        </button>
      </div>
    </nav>
  );
}
