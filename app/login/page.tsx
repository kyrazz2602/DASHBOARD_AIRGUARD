"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Mail, Lock, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  // State management
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // State baru untuk toggle password
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please check your credentials."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10 flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500 slide-in-from-bottom-4">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2 text-primary">
            AIRGUARD
          </h1>
          <p className="text-muted-foreground text-sm">
            Air Quality Monitoring Dashboard
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-card rounded-2xl border border-border shadow-xl p-8 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center text-primary">
            Sign In
          </h2>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3 animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive font-medium leading-relaxed">
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-3 w-5 h-5 text-muted-foreground pointer-events-none transition-colors group-focus-within:text-primary" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-12 pr-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  className="text-sm font-medium text-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  htmlFor="password">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-3 w-5 h-5 text-muted-foreground pointer-events-none" />
                <input
                  id="password"
                  // Logika toggle tipe input di sini
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                  required
                  minLength={6}
                />

                {/* Tombol Toggle Password Visibility */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  disabled={isLoading}>
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        {/* Features Grid (Small cleanups) */}
        <div className="mt-10 grid grid-cols-3 gap-4 border-t border-border/40 pt-6">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-foreground text-primary">24/7</h3>
            <p className="text-xs text-muted-foreground font-medium">
              Monitoring
            </p>
          </div>
          <div className="text-center space-y-1 border-l border-border/40">
            <h3 className="text-lg font-bold text-foreground text-primary">Live</h3>
            <p className="text-xs text-muted-foreground font-medium">
              Real-time
            </p>
          </div>
          <div className="text-center space-y-1 border-l border-border/40">
            <h3 className="text-lg font-bold text-foreground text-primary">Instant</h3>
            <p className="text-xs text-muted-foreground font-medium">Alerts</p>
          </div>
        </div>
      </div>
    </div>
  );
}
