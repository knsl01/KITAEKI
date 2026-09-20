"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";

export async function askKitaAi(history: { role: "user" | "model"; parts: { text: string }[]; toolCall?: any; toolResult?: any }[], prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return {
      error: "Kunci API (GEMINI_API_KEY) belum dikonfigurasi. Silakan tambahkan di .env.local kamu.",
    };
  }

  try {
    const supabase = await createClient();
    const workspace = await getWorkspace();
    const householdId = workspace?.householdId;
    
    if (!householdId) {
      return { error: "Data workspace tidak ditemukan." };
    }
    
    // Ambil rekap data keuangan secara dinamis
    const dateStart = new Date();
    dateStart.setDate(1); // awal bulan
    const startDateStr = dateStart.toISOString().split("T")[0];
    
    const [{ data: accounts }, { data: txs }, { data: categories }, { data: recentTasks }] = await Promise.all([
      supabase.from("accounts").select("id, name, balance, owner").eq("household_id", householdId),
      supabase.from("transactions").select("id, type, amount, owner, description, occurred_on").eq("household_id", householdId).gte("occurred_on", startDateStr).order('occurred_on', { ascending: false }).limit(10),
      supabase.from("categories").select("id, name, type").eq("household_id", householdId),
      supabase.from("tasks").select("id, title, due_on, assigned_to").eq("household_id", householdId).order('created_at', { ascending: false }).limit(10)
    ]);
      
    let income = 0;
    let expense = 0;
    const txContext = (txs || []).map(tx => {
      if (tx.type === "income") income += tx.amount;
      if (tx.type === "expense") expense += tx.amount;
      return `- ID: ${tx.id} | ${tx.description} | Rp${tx.amount} | Tgl: ${tx.occurred_on} | Tipe: ${tx.type}`;
    }).join("\n");
    
    const accountSummary = (accounts || []).map(a => `- ID: ${a.id} | ${a.name} (${a.owner}): Rp${a.balance.toLocaleString('id-ID')}`).join("\n");
    const categorySummary = (categories || []).map(c => `- ID: ${c.id} | ${c.name} (${c.type})`).join("\n");
    const taskSummary = (recentTasks || []).map(t => `- ID: ${t.id} | ${t.title} | Tgl: ${t.due_on}`).join("\n");

    const financialContext = `[DATA KEUANGAN REAL-TIME BULAN INI]
Saldo Rekening:
${accountSummary || "Kosong"}

Kategori Tersedia:
${categorySummary || "Kosong"}

10 Transaksi Terakhir (Gunakan ID ini jika mau hapus/update):
${txContext || "Kosong"}

10 Event/Rencana Terakhir (Gunakan ID ini jika mau hapus/update):
${taskSummary || "Kosong"}

Pemasukan Bulan Ini: Rp${income.toLocaleString('id-ID')}
Pengeluaran Bulan Ini: Rp${expense.toLocaleString('id-ID')}

PENTING:
- Jika user meminta memasukkan transaksi keuangan (add_income, add_expense), panggil tool yang sesuai.
- WAJIB gunakan ID dari "Saldo Rekening" untuk parameter account_id! (Minta user memilih akun jika tidak jelas).
- WAJIB gunakan ID dari "Kategori Tersedia" untuk parameter category_id (atau biarkan null jika tidak relevan).
- Format tanggal wajib YYYY-MM-DD.
- Jika user meminta rekap keuangan bulanan, BUATLAH format JSON di dalam blok markdown \`\`\`json ... \`\`\` seperti ini:
  \`\`\`json
  { "type": "financial_summary", "data": { "income": 1000000, "expense": 500000, "balance": 500000, "insight": "Pengeluaran terbesarmu di makanan.", "suggestion": "Kurangi jajan." } }
  \`\`\`
- Jika user meminta rencana tabungan/nabung, BUATLAH format:
  \`\`\`json
  { "type": "savings_plan", "data": { "target_name": "Macbook", "target_amount": 20000000, "monthly_target": 2000000, "duration_months": 10 } }
  \`\`\`
- Jika user meminta rencana liburan/traveling, BUATLAH format:
  \`\`\`json
  { "type": "travel_plan", "data": { "destination": "Bali", "budget": 5000000, "duration_days": 3, "activities": ["Pantai Kuta", "Ubud"], "estimated_costs": { "transport": 2000000, "accommodation": 1500000, "food": 1000000, "other": 500000 } } }
  \`\`\`
PASTIKAN jika menggunakan format di atas, JANGAN tambahkan teks pengantar/penutup lain di luar blok \`\`\`json, agar langsung di-render menjadi visual card oleh UI. Untuk obrolan biasa (general), gunakan Markdown biasa.`;

    // Map history to Gemini format. Exclude toolCall internal messages unless properly structured.
    // We will just map regular conversation, or properly pass function calls and responses.
    const contents = history.map(m => {
      if (m.role === "assistant" && (m as any).toolCall) {
        return {
          role: "model",
          parts: [{ functionCall: { name: (m as any).toolCall.name, args: (m as any).toolCall.args } }]
        };
      }
      if (m.role === "user" && (m as any).toolResult) {
        return {
          role: "user",
          parts: [{ functionResponse: { name: (m as any).toolResult.name, response: { result: (m as any).toolResult.result } } }]
        };
      }
      return { role: m.role, parts: [{ text: m.parts?.[0]?.text || "" }] };
    });
    
    // Pastikan history terakhir adalah pesan terbaru
    contents.push({ role: "user", parts: [{ text: prompt }] });
    
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
          tools: [{
            functionDeclarations: [
              {
                name: "add_income",
                description: "Menambahkan transaksi pemasukan (income) ke database.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    title: { type: "STRING", description: "Judul transaksi, contoh: Gaji Bulan Oktober" },
                    amount: { type: "NUMBER", description: "Nominal pemasukan" },
                    account_id: { type: "STRING", description: "ID rekening tujuan pemasukan" },
                    category_id: { type: "STRING", description: "ID kategori (opsional)" },
                    date: { type: "STRING", description: "Tanggal transaksi (YYYY-MM-DD)" },
                    owner: { type: "STRING", description: "Pemilik (eki, dinda, atau shared)" }
                  },
                  required: ["title", "amount", "account_id", "date"]
                }
              },
              {
                name: "add_expense",
                description: "Menambahkan transaksi pengeluaran (expense) ke database.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    title: { type: "STRING", description: "Judul transaksi, contoh: Beli Bakso" },
                    amount: { type: "NUMBER", description: "Nominal pengeluaran" },
                    account_id: { type: "STRING", description: "ID rekening sumber dana pengeluaran" },
                    category_id: { type: "STRING", description: "ID kategori (opsional)" },
                    date: { type: "STRING", description: "Tanggal transaksi (YYYY-MM-DD)" },
                    owner: { type: "STRING", description: "Pemilik (eki, dinda, atau shared)" }
                  },
                  required: ["title", "amount", "account_id", "date"]
                }
              },
              {
                name: "delete_transaction",
                description: "Menghapus transaksi berdasarkan ID.",
                parameters: { type: "OBJECT", properties: { id: { type: "STRING" } }, required: ["id"] }
              },
              {
                name: "update_transaction",
                description: "Mengubah transaksi keuangan.",
                parameters: { type: "OBJECT", properties: { id: { type: "STRING" }, title: { type: "STRING" }, amount: { type: "NUMBER" }, account_id: { type: "STRING" }, category_id: { type: "STRING" }, date: { type: "STRING" }, owner: { type: "STRING" } }, required: ["id"] }
              },
              {
                name: "create_savings_goal",
                description: "Membuat target tabungan impian.",
                parameters: { type: "OBJECT", properties: { name: { type: "STRING" }, target_amount: { type: "NUMBER" }, target_date: { type: "STRING", description: "YYYY-MM-DD" }, owner: { type: "STRING" } }, required: ["name", "target_amount", "target_date"] }
              },
              {
                name: "create_trip",
                description: "Membuat rencana liburan atau acara di kalender.",
                parameters: { type: "OBJECT", properties: { title: { type: "STRING" }, date: { type: "STRING" }, owner: { type: "STRING" } }, required: ["title", "date"] }
              },
              {
                name: "create_event",
                description: "Membuat rencana atau tugas di kalender.",
                parameters: { type: "OBJECT", properties: { title: { type: "STRING" }, date: { type: "STRING" }, owner: { type: "STRING" } }, required: ["title", "date"] }
              },
              {
                name: "update_event",
                description: "Mengupdate rencana di kalender.",
                parameters: { type: "OBJECT", properties: { id: { type: "STRING" }, title: { type: "STRING" }, date: { type: "STRING" }, owner: { type: "STRING" } }, required: ["id"] }
              },
              {
                name: "delete_event",
                description: "Menghapus rencana di kalender.",
                parameters: { type: "OBJECT", properties: { id: { type: "STRING" } }, required: ["id"] }
              }
            ]
          }],
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

    const firstPart = data.candidates?.[0]?.content?.parts?.[0];
    
    if (firstPart?.functionCall) {
      return { 
        toolCall: {
          name: firstPart.functionCall.name,
          args: firstPart.functionCall.args
        }
      };
    }

    const reply = firstPart?.text;
    
    if (!reply) {
      return { error: "Maaf, KITA AI tidak bisa memproses pertanyaanmu saat ini." };
    }

    return { reply };
  } catch (error) {
    console.error("AI Action Error:", error);
    return { error: "Terjadi kesalahan internal saat menghubungi KITA AI." };
  }
}
