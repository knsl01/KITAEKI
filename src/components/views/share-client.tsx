"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Share2, Sparkles, Target, Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-header";

type Member = { full_name: string | null; email: string | null; avatar_url: string | null };

const QUOTES = [
  "Bersama menggapai mimpi, satu tabungan demi satu tujuan. ✨",
  "Uang bisa dicari, tapi momen berdua tak terganti. 💖",
  "Membangun masa depan lebih mudah kalau dilakukan berdua. 🚀",
  "Lebih dari sekadar angka, ini tentang perjalanan kita. 💑",
  "Disiplin menabung hari ini, bebas finansial esok hari! 💸",
  "Komunikasi adalah kunci, begitu juga transparansi finansial. 🔑"
];

function AvatarShare({ name, url, className }: { name: string; url?: string | null; className?: string }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <div className={`flex items-center justify-center font-bold rounded-full overflow-hidden border-2 border-white/20 shadow-lg ${className}`}>
      {url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-white drop-shadow-md">{initial}</span>
      )}
    </div>
  );
}

export function ShareClient({
  totalBalance,
  savings,
  members,
  memberKey
}: {
  totalBalance: number;
  savings: any[];
  members: any[];
  memberKey: string;
}) {
  const [mode, setMode] = useState<"balance" | "savings" | "quotes">("balance");
  const [quoteIndex, setQuoteIndex] = useState(0);
  const me = members.find((m) => m.member_key === memberKey) || members[0];
  const partner = members.find((m) => m.member_key !== memberKey && m.member_key !== "shared");

  useEffect(() => {
    setQuoteIndex(Math.floor(Math.random() * QUOTES.length));
  }, [mode]);

  const rp = (num: number) => "Rp" + num.toLocaleString("id-ID");

  const bestSaving = savings.length > 0 
    ? [...savings].sort((a, b) => (b.current_amount / b.target_amount) - (a.current_amount / a.target_amount))[0] 
    : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Share ke IG Story" description="Pilih template dan pamerkan pencapaian finansial kalian!" />

      <div className="flex flex-col gap-4 mb-6">
        <Select value={mode} onValueChange={(val: any) => setMode(val)}>
          <SelectTrigger className="w-full h-12 rounded-xl bg-card">
            <SelectValue placeholder="Pilih Template Story" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="balance"><div className="flex items-center"><Wallet className="w-4 h-4 mr-2"/> Saldo Bersama</div></SelectItem>
            <SelectItem value="savings"><div className="flex items-center"><Target className="w-4 h-4 mr-2"/> Target Tabungan</div></SelectItem>
            <SelectItem value="quotes"><div className="flex items-center"><Sparkles className="w-4 h-4 mr-2"/> Motivasi & Quotes</div></SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Story Container - 9:16 aspect ratio */}
      <div className="relative mx-auto w-full max-w-[320px] aspect-[9/16] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-muted">
        
        {/* Backgrounds */}
        {mode === "balance" && <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />}
        {mode === "savings" && <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400 via-teal-500 to-cyan-600" />}
        {mode === "quotes" && <div className="absolute inset-0 bg-gradient-to-bl from-rose-400 via-fuchsia-500 to-indigo-500" />}
        
        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col h-full p-6 text-white text-center">
          
          {/* Header Avatars */}
          <div className="flex justify-center items-center mt-6 mb-8">
            <AvatarShare name={me?.full_name || "?"} url={me?.avatar_url} className="w-16 h-16 bg-white/20 backdrop-blur-sm z-20" />
            {partner && (
              <AvatarShare name={partner.full_name || "?"} url={partner.avatar_url} className="w-16 h-16 bg-white/20 backdrop-blur-sm -ml-4 z-10" />
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            {mode === "balance" && (
              <div className="w-full bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-lg">
                <p className="text-white/80 text-sm font-medium uppercase tracking-wider mb-2">Total Saldo Bersama</p>
                <h2 className="text-3xl font-extrabold drop-shadow-md mb-2">{rp(totalBalance)}</h2>
                <p className="text-xs text-white/70">Membangun impian, satu rupiah demi satu rupiah.</p>
              </div>
            )}

            {mode === "savings" && bestSaving && (
              <div className="w-full bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-lg">
                <p className="text-white/80 text-sm font-medium uppercase tracking-wider mb-2">Progress Tabungan</p>
                <h2 className="text-2xl font-bold drop-shadow-md leading-tight mb-4">{bestSaving.name}</h2>
                <div className="w-full h-3 bg-black/20 rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-white rounded-full" 
                    style={{ width: `${Math.min(100, (bestSaving.current_amount / bestSaving.target_amount) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-semibold drop-shadow-sm">
                  <span>{rp(bestSaving.current_amount)}</span>
                  <span>{rp(bestSaving.target_amount)}</span>
                </div>
              </div>
            )}

            {mode === "savings" && !bestSaving && (
              <p className="text-lg font-medium drop-shadow-md">Belum ada target tabungan aktif.</p>
            )}

            {mode === "quotes" && (
              <div className="w-full px-4">
                <Sparkles className="w-8 h-8 mx-auto mb-4 text-yellow-300 drop-shadow-md" />
                <p className="text-2xl font-serif italic drop-shadow-md leading-snug">
                  "{QUOTES[quoteIndex]}"
                </p>
              </div>
            )}
          </div>

          {/* Footer with QR */}
          <div className="mt-auto mb-4 flex flex-col items-center">
            <div className="bg-white p-1.5 rounded-xl shadow-lg mb-3">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://kita.knsl.tech&color=14201A" alt="QR Code" className="w-16 h-16 rounded-lg" />
            </div>
            <p className="text-xs font-bold tracking-widest drop-shadow-md">KITA.KNSL.TECH</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-center pt-4">
        <Button variant="outline" className="w-full max-w-[150px] rounded-full" onClick={() => setQuoteIndex((i) => (i + 1) % QUOTES.length)}>
          Ganti Quote
        </Button>
        <Button className="w-full max-w-[150px] rounded-full" onClick={() => alert("Screenshot layar ini (Volume Down + Power) lalu share ke IG Story kamu! 📸")}>
          <Share2 className="w-4 h-4 mr-2" /> Share
        </Button>
      </div>
    </div>
  );
}
