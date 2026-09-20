import React from "react";
import { TrendingUp, Target, Plane, Wallet, CheckCircle2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function FinancialSummaryCard({ data }: { data: any }) {
  if (!data) return null;
  return (
    <Card className="my-4 bg-muted/30 border-primary/20 shadow-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Wallet className="h-24 w-24" />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-serif flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" /> Rekap Keuangan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 relative z-10">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Pemasukan</p>
            <p className="text-lg font-bold text-green-500">Rp{Number(data.income).toLocaleString("id-ID")}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Pengeluaran</p>
            <p className="text-lg font-bold text-rose-500">Rp{Number(data.expense).toLocaleString("id-ID")}</p>
          </div>
          <div className="space-y-1 col-span-2 p-3 bg-primary/10 rounded-xl border border-primary/20">
            <p className="text-xs text-primary font-medium">Sisa Saldo</p>
            <p className="text-xl font-bold">Rp{Number(data.balance).toLocaleString("id-ID")}</p>
          </div>
        </div>
        {data.insight && (
          <div className="text-sm bg-background/50 p-3 rounded-xl border border-border">
            <span className="font-semibold block mb-1">💡 Insight</span>
            {data.insight}
          </div>
        )}
        {data.suggestion && (
          <div className="text-sm bg-background/50 p-3 rounded-xl border border-border">
            <span className="font-semibold block mb-1">✨ Saran</span>
            {data.suggestion}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SavingsPlanCard({ data }: { data: any }) {
  if (!data) return null;
  return (
    <Card className="my-4 bg-muted/30 border-primary/20 shadow-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Target className="h-24 w-24" />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-serif flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" /> {data.target_name || "Rencana Tabungan"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 relative z-10">
        <div className="flex flex-col gap-1 p-3 bg-primary/10 rounded-xl border border-primary/20">
          <p className="text-xs text-primary font-medium">Target Saldo</p>
          <p className="text-xl font-bold">Rp{Number(data.target_amount).toLocaleString("id-ID")}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Target per Bulan</p>
            <p className="text-sm font-bold">Rp{Number(data.monthly_target).toLocaleString("id-ID")}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Durasi</p>
            <p className="text-sm font-bold">{data.duration_months} bulan</p>
          </div>
        </div>
        <Button className="w-full mt-2" variant="outline" size="sm">
          <CheckCircle2 className="h-4 w-4 mr-2" /> Terapkan ke Target
        </Button>
      </CardContent>
    </Card>
  );
}

export function TravelPlanCard({ data }: { data: any }) {
  if (!data) return null;
  return (
    <Card className="my-4 bg-muted/30 border-primary/20 shadow-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Plane className="h-24 w-24" />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-serif flex items-center gap-2">
          <Plane className="h-5 w-5 text-primary" /> Liburan: {data.destination || "Destinasi"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 relative z-10">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Budget</p>
            <p className="text-lg font-bold text-primary">Rp{Number(data.budget).toLocaleString("id-ID")}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Durasi</p>
            <p className="text-lg font-bold">{data.duration_days} Hari</p>
          </div>
        </div>
        
        {data.estimated_costs && (
          <div className="space-y-2 text-sm bg-background/50 p-3 rounded-xl border border-border">
            <p className="font-semibold border-b border-border pb-1">Estimasi Biaya</p>
            <div className="flex justify-between"><span>✈️ Transport:</span> <span>Rp{Number(data.estimated_costs.transport || 0).toLocaleString("id-ID")}</span></div>
            <div className="flex justify-between"><span>🏨 Penginapan:</span> <span>Rp{Number(data.estimated_costs.accommodation || 0).toLocaleString("id-ID")}</span></div>
            <div className="flex justify-between"><span>🍔 Konsumsi:</span> <span>Rp{Number(data.estimated_costs.food || 0).toLocaleString("id-ID")}</span></div>
            <div className="flex justify-between"><span>🎟️ Lain-lain:</span> <span>Rp{Number(data.estimated_costs.other || 0).toLocaleString("id-ID")}</span></div>
          </div>
        )}

        {data.activities && data.activities.length > 0 && (
          <div className="text-sm bg-background/50 p-3 rounded-xl border border-border">
            <p className="font-semibold mb-2 flex items-center gap-1"><Sparkles className="h-3 w-3 text-amber-500" /> Ide Aktivitas</p>
            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
              {data.activities.map((act: string, i: number) => (
                <li key={i}>{act}</li>
              ))}
            </ul>
          </div>
        )}
        <Button className="w-full mt-2" variant="outline" size="sm">
          <CheckCircle2 className="h-4 w-4 mr-2" /> Jadwalkan di Kalender
        </Button>
      </CardContent>
    </Card>
  );
}

// Temporary Button for internal use
function Button({ children, className, variant, size, ...props }: any) {
  return (
    <button className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      variant === "outline" ? "border border-input bg-background hover:bg-accent hover:text-accent-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90",
      size === "sm" ? "h-9 px-3" : "h-10 px-4 py-2",
      className
    )} {...props}>
      {children}
    </button>
  );
}
