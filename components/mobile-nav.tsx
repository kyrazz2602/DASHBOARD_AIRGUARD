"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Menu, X, Home, LayoutDashboard, LogOut } from "lucide-react";

export function MobileNav() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/home");
    setIsOpen(false);
  };

  const navigateTo = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden fixed top-14 left-0 right-0 z-30 bg-card border-b border-border shadow-lg">
          <nav className="flex flex-col">
            <button
              onClick={() => navigateTo("/home")}
              className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted transition-colors border-b border-border">
              <Home className="w-5 h-5" />
              <span className="font-medium">About</span>
            </button>
            {user && (
              <button
                onClick={() => navigateTo("/dashboard")}
                className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted transition-colors border-b border-border">
                <LayoutDashboard className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </button>
            )}
            {user && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted transition-colors">
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            )}
          </nav>
        </div>
      )}

      {/* Mobile Bottom Navigation (only on dashboard) */}
      {user && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border px-4 py-2">
          <div className="flex items-center justify-around">
            <button
              onClick={() => navigateTo("/home")}
              className="flex flex-col items-center gap-1 py-2 px-4 text-muted-foreground hover:text-primary transition-colors">
              <Home className="w-5 h-5" />
              <span className="text-xs font-medium">Home</span>
            </button>
            <button
              onClick={() => navigateTo("/dashboard")}
              className="flex flex-col items-center gap-1 py-2 px-4 text-primary transition-colors">
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-xs font-medium">Dashboard</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex flex-col items-center gap-1 py-2 px-4 text-muted-foreground hover:text-primary transition-colors">
              <LogOut className="w-5 h-5" />
              <span className="text-xs font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
