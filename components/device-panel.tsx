import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cpu } from "lucide-react"; // Menambahkan ikon untuk visual lebih baik

// Definisi tipe data untuk keamanan kode (TypeScript)
interface DeviceProps {
  name: string;
  status: "Aktif" | "Nonaktif" | "Maintenance";
  deviceId: string;
}

export function DevicePanel({ name, status, deviceId }: DeviceProps) {
  // Fungsi helper untuk menentukan warna badge secara dinamis
  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Aktif":
        return "bg-green-50 text-green-700 border-green-200";
      case "Nonaktif":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-card border-0 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-4">
          {/* Bagian Visual/Ikon Perangkat */}
          <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center relative">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-400 to-slate-600 rounded-lg flex items-center justify-center">
              <Cpu className="text-white/50 w-8 h-8" />
            </div>
            {/* Indikator Titik Aktif (Optional) */}
            {status === "Aktif" && (
              <span className="absolute top-1 right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            )}
          </div>

          {/* Bagian Informasi */}
          <div className="flex-1">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                ID: {deviceId}
              </span>
              <h3 className="font-bold text-lg text-foreground leading-tight">
                {name}
              </h3>
            </div>
            <Badge
              variant="outline"
              className={`mt-2 font-medium ${getStatusStyles(status)}`}>
              {status}
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
