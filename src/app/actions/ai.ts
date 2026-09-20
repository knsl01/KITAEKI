"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/workspace";

export async function askKitaAi(history: { role: "user" | "model"; parts: { text: string }[] }[], prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return {
      error: "Kunci API (GEMINI_API_KEY) belum dikonfigurasi. Silakan tambahkan di .env.local kamu.",
    };
  }

  try {
    const supabase = await createClient();
    const householdId = await getWorkspaceId();
    
    // Ambil rekap data keuangan secara dinamis
    const dateStart = new Date();
    dateStart.setDate(1); // awal bulan
    const startDateStr = dateStart.toISOString().split("T")[0];
    
    const { data: accounts } = await supabase.from("accounts").select("name, balance, owner").eq("household_id", householdId);
    const { data: txs } = await supabase.from("transactions")
      .select("type, amount, owner")
      .eq("household_id", householdId)
      .gte("occurred_on", startDateStr);
      
    let income = 0;
    let expense = 0;
    txs?.forEach(tx => {
      if (tx.type === "income") income += tx.amount;
      if (tx.type === "expense") expense += tx.amount;
    });
    
    const accountSummary = accounts?.map(a => `${a.name} (${a.owner}): Rp${a.balance.toLocaleString('id-ID')}`).join(", ");
    const financialContext = `[DATA KEUANGAN REAL-TIME BULAN INI]\nSaldo Rekening: ${accountSummary || "Kosong"}\nPemasukan Bulan Ini: Rp${income.toLocaleString('id-ID')}\nPengeluaran Bulan Ini: Rp${expense.toLocaleString('id-ID')}\n\nGunakan data di atas jika ditanya soal rekap pengeluaran/pemasukan/saldo. Ingatkan pengguna bahwa mereka bisa mengekspor laporan lengkap ke format CSV (Excel/Google Sheets) di halaman Keuangan -> Unduh Laporan.`;

    const contents = [...history, { role: "user", parts: [{ text: prompt }] }];
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            role: "system",
            parts: [{ text: `Kamu adalah KITA AI, asisten keuangan dan perencanaan cerdas untuk aplikasi KITA (digunakan oleh pasangan). Berbicaralah dengan nada santai, ramah, suportif, dan bahasa Indonesia gaul tapi sopan. Fokus pada memberikan saran keuangan, menabung, atau ide liburan.\n\n${financialContext}` }]
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Gemini API Error:", data);
      return { error: `Gemini Error: ${data?.error?.message || "Gangguan koneksi"}` };
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!reply) {
      return { error: "Maaf, KITA AI tidak bisa memproses pertanyaanmu saat ini." };
    }

    return { reply };
  } catch (error) {
    console.error("AI Action Error:", error);
    return { error: "Terjadi kesalahan internal saat menghubungi KITA AI." };
  }
}
