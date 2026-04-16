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
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/60 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-1">
        {items.map(({ label, icon: Icon, path }) => {
          const active = pathname === path;
          return (
            <button
              key={path}
              onClick={() => router.push(path)}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 px-6 rounded-xl transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-transform",
                  active && "scale-110",
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-semibold",
                  active && "font-bold",
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
          className="flex flex-col items-center gap-1 py-2.5 px-6 rounded-xl text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Keluar</span>
        </button>
      </div>
    </nav>
  );
}
