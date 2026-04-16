"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Home, LayoutDashboard, LogOut } from "lucide-react";

export function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/home");
  };

  const navigateTo = (path: string) => {
    router.push(path);
  };

  if (!user) return null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border">
      <div className="flex items-center justify-around px-2 py-1 safe-area-pb">
        <button
          onClick={() => navigateTo("/home")}
          className={`flex flex-col items-center gap-1 py-2 px-5 rounded-xl transition-colors ${
            pathname === "/home"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <button
          onClick={() => navigateTo("/dashboard")}
          className={`flex flex-col items-center gap-1 py-2 px-5 rounded-xl transition-colors ${
            pathname === "/dashboard"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 py-2 px-5 rounded-xl text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
