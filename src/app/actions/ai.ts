"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";

type ChatTurn = { role: "user" | "model"; parts: { text: string }[] };
type ToolCall = { name: string; args: Record<string, unknown> };
type AiResponse = { reply: string } | { toolCall: ToolCall } | { error: string };

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const functionDeclarations = [
  { name: "add_income", description: "Catat pemasukan ke akun rumah tangga.", parameters: { type: "OBJECT", properties: { title: { type: "STRING" }, amount: { type: "NUMBER" }, account_id: { type: "STRING" }, category_id: { type: "STRING" }, date: { type: "STRING", description: "Tanggal YYYY-MM-DD" }, owner: { type: "STRING", enum: ["eki", "dinda", "shared"] } }, required: ["title", "amount", "account_id", "date"] } },
  { name: "add_expense", description: "Catat pengeluaran dari akun rumah tangga.", parameters: { type: "OBJECT", properties: { title: { type: "STRING" }, amount: { type: "NUMBER" }, account_id: { type: "STRING" }, category_id: { type: "STRING" }, date: { type: "STRING", description: "Tanggal YYYY-MM-DD" }, owner: { type: "STRING", enum: ["eki", "dinda", "shared"] } }, required: ["title", "amount", "account_id", "date"] } },
  { name: "delete_transaction", description: "Hapus transaksi dengan ID yang cocok dari daftar transaksi.", parameters: { type: "OBJECT", properties: { id: { type: "STRING" } }, required: ["id"] } },
  { name: "update_transaction", description: "Ubah transaksi dengan ID yang cocok. Isi hanya kolom yang memang diubah.", parameters: { type: "OBJECT", properties: { id: { type: "STRING" }, title: { type: "STRING" }, amount: { type: "NUMBER" }, account_id: { type: "STRING" }, category_id: { type: "STRING" }, date: { type: "STRING" }, owner: { type: "STRING", enum: ["eki", "dinda", "shared"] } }, required: ["id"] } },
  { name: "create_savings_goal", description: "Buat target tabungan baru.", parameters: { type: "OBJECT", properties: { name: { type: "STRING" }, target_amount: { type: "NUMBER" }, target_date: { type: "STRING", description: "YYYY-MM-DD" }, owner: { type: "STRING", enum: ["eki", "dinda", "shared"] } }, required: ["name", "target_amount", "target_date"] } },
  { name: "create_event", description: "Buat tugas atau rencana kalender baru.", parameters: { type: "OBJECT", properties: { title: { type: "STRING" }, date: { type: "STRING", description: "YYYY-MM-DD" }, owner: { type: "STRING", enum: ["eki", "dinda", "shared"] } }, required: ["title", "date"] } },
  { name: "create_trip", description: "Buat rencana perjalanan di kalender.", parameters: { type: "OBJECT", properties: { title: { type: "STRING" }, date: { type: "STRING", description: "YYYY-MM-DD" }, owner: { type: "STRING", enum: ["eki", "dinda", "shared"] } }, required: ["title", "date"] } },
  { name: "update_event", description: "Ubah tugas atau rencana kalender dengan ID yang cocok.", parameters: { type: "OBJECT", properties: { id: { type: "STRING" }, title: { type: "STRING" }, date: { type: "STRING" }, owner: { type: "STRING", enum: ["eki", "dinda", "shared"] } }, required: ["id"] } },
  { name: "delete_event", description: "Hapus tugas atau rencana kalender berdasarkan ID.", parameters: { type: "OBJECT", properties: { id: { type: "STRING" } }, required: ["id"] } },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatRupiah(value: unknown) {
  return `Rp${Number(value ?? 0).toLocaleString("id-ID")}`;
}

function jakartaDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

export async function askKitaAi(history: ChatTurn[], prompt: string): Promise<AiResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { error: "KITA AI belum tersambung. Tambahkan GEMINI_API_KEY di pengaturan environment aplikasi." };

  try {
    const supabase = await createClient();
    const workspace = await getWorkspace();
    const householdId = workspace?.householdId;
    if (!householdId) return { error: "Workspace belum ditemukan. Hubungkan akun ke workspace terlebih dahulu." };

    const today = jakartaDate();
    const monthStart = `${today.slice(0, 7)}-01`;
    const [accountsResult, transactionsResult, categoriesResult, tasksResult, goalsResult, recurringResult, allocationsResult] = await Promise.all([
      supabase.from("accounts").select("id, name, balance, owner").eq("household_id", householdId).eq("is_active", true).order("name"),
      supabase.from("transactions").select("id, type, amount, owner, description, occurred_on, account_id, category_id").eq("household_id", householdId).is("archived_at", null).gte("occurred_on", monthStart).lte("occurred_on", today).order("occurred_on", { ascending: false }).limit(200),
      supabase.from("categories").select("id, name, kind").eq("household_id", householdId).order("name"),
      supabase.from("tasks").select("id, title, due_on, assigned_to, is_done").eq("household_id", householdId).order("due_on", { ascending: true }).limit(30),
      supabase.from("savings_goals").select("id, name, target_amount, current_amount, target_date, owner").eq("household_id", householdId).eq("is_archived", false),
      supabase.from("recurring_transactions").select("description, amount, type, next_run_on, frequency, is_active").eq("household_id", householdId).eq("is_active", true).order("next_run_on").limit(30),
      supabase.from("account_allocations").select("account_id, category_id, target_amount, allocated_amount, spent_amount").eq("household_id", householdId),
    ]);

    const failed = [accountsResult, transactionsResult, categoriesResult, tasksResult, goalsResult, recurringResult, allocationsResult].find((result) => result.error);
    if (failed?.error) {
      console.error("KITA AI context query failed:", failed.error.message);
      return { error: "Data KITA belum bisa dibaca. Coba muat ulang halaman atau hubungi pengelola aplikasi." };
    }

    const accounts = accountsResult.data ?? [];
    const transactions = transactionsResult.data ?? [];
    const categories = categoriesResult.data ?? [];
    const income = transactions.filter((row) => row.type === "income").reduce((total, row) => total + Number(row.amount), 0);
    const expense = transactions.filter((row) => row.type === "expense").reduce((total, row) => total + Number(row.amount), 0);
    const categoryById = new Map(categories.map((category) => [category.id, category.name]));
    const accountById = new Map(accounts.map((account) => [account.id, account.name]));

    const context = `Tanggal hari ini ${today} (zona waktu Asia/Jakarta). Pengguna: ${workspace.displayName}; anggota rumah tangga: ${workspace.coupleName}.
Saldo akun aktif:
${accounts.map((account) => `- id=${account.id}; ${account.name}; pemilik=${account.owner}; saldo=${formatRupiah(account.balance)}`).join("\n") || "- Belum ada akun aktif"}
Kategori:
${categories.map((category) => `- id=${category.id}; ${category.name}; jenis=${category.kind}`).join("\n") || "- Belum ada kategori"}
Transaksi bulan ini (${transactions.length} catatan, dimulai ${monthStart}; jika 200 baris tercapai, sebutkan bahwa daftar dibatasi): pemasukan ${formatRupiah(income)}; pengeluaran ${formatRupiah(expense)}.
${transactions.map((row) => `- id=${row.id}; ${row.occurred_on}; ${row.type}; ${formatRupiah(row.amount)}; ${row.description || "tanpa keterangan"}; akun=${accountById.get(row.account_id ?? "") ?? "akun tidak diketahui"}; kategori=${categoryById.get(row.category_id ?? "") ?? "tanpa kategori"}; pemilik=${row.owner}`).join("\n") || "Belum ada transaksi bulan ini."}
Pos anggaran:
${(allocationsResult.data ?? []).map((row) => `- ${accountById.get(row.account_id ?? "") ?? "akun"} / ${categoryById.get(row.category_id) ?? "kategori"}: target ${formatRupiah(row.target_amount)}, terisi ${formatRupiah(row.allocated_amount)}, terpakai ${formatRupiah(row.spent_amount)}`).join("\n") || "- Belum ada pos"}
Target tabungan:
${(goalsResult.data ?? []).map((row) => `- ${row.name}; terkumpul ${formatRupiah(row.current_amount)} dari ${formatRupiah(row.target_amount)}; target tanggal ${row.target_date ?? "belum ditentukan"}; pemilik=${row.owner}`).join("\n") || "- Belum ada target"}
Tagihan/pemasukan berulang:
${(recurringResult.data ?? []).map((row) => `- ${row.description ?? "Tanpa nama"}; ${row.type}; ${formatRupiah(row.amount)}; berikutnya ${row.next_run_on}; frekuensi ${row.frequency}`).join("\n") || "- Belum ada"}
Agenda/tugas:
${(tasksResult.data ?? []).map((row) => `- id=${row.id}; ${row.title}; jatuh tempo ${row.due_on ?? "fleksibel"}; status ${row.is_done ? "selesai" : "belum selesai"}; untuk ${row.assigned_to}`).join("\n") || "- Belum ada"}`;

    const systemInstruction = `Kamu adalah KITA AI, asisten keuangan dan perencana rumah tangga yang membantu pasangan mengelola uang dan rencana bersama. Jawab dalam Bahasa Indonesia yang hangat, lugas, dan tidak menghakimi. Pakai angka rupiah yang jelas. Gunakan data di bawah sebagai satu-satunya sumber fakta pribadi; jangan mengarang saldo atau transaksi. Kalau data tidak cukup atau ada beberapa akun/kategori yang mungkin dimaksud, tanyakan dulu, jangan menebak. Saat pengguna meminta tindakan yang didukung, buat satu pemanggilan fungsi dan tunggu konfirmasi pengguna di aplikasi. Jangan pernah mengaku aksi berhasil sebelum aplikasi menyatakan berhasil. Untuk pertanyaan analisis, jelaskan rentang tanggal dan dasar hitungan. Jangan menyebut data transaksi lengkap bila konteks hanya menampilkan sampel. Jika pengguna meminta ringkasan pemasukan/pengeluaran, kembalikan satu blok JSON dengan bentuk { "type": "financial_summary", "data": { "income": angka, "expense": angka, "balance": angka, "insight": "...", "suggestion": "..." } }. Untuk rencana menabung gunakan bentuk { "type": "savings_plan", "data": { "target_name": "...", "target_amount": angka, "monthly_target": angka, "duration_months": angka } }. Untuk rencana perjalanan gunakan bentuk { "type": "travel_plan", "data": { "destination": "...", "budget": angka, "duration_days": angka, "activities": ["..."], "estimated_costs": { "transport": angka, "accommodation": angka, "food": angka, "other": angka } } }. Jangan gunakan kartu JSON untuk obrolan biasa.

Data KITA:
${context}`;

    const contents: ChatTurn[] = history.slice(-20).filter((turn) => turn.parts.some((part) => part.text.trim().length > 0));
    if (prompt.trim()) contents.push({ role: "user", parts: [{ text: prompt.trim() }] });
    if (contents.length === 0) return { error: "Tulis pertanyaan atau perintah dulu." };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        tools: [{ functionDeclarations }],
        contents,
        generationConfig: { temperature: 0.35, maxOutputTokens: 2048 },
      }),
    });

    const payload: unknown = await response.json();
    if (!response.ok) {
      const errorMessage = isRecord(payload) && isRecord(payload.error) && typeof payload.error.message === "string" ? payload.error.message : "Koneksi ke layanan AI gagal.";
      console.error("Gemini API Error:", errorMessage);
      return { error: `KITA AI gagal merespons: ${errorMessage}` };
    }

    if (!isRecord(payload) || !Array.isArray(payload.candidates)) return { error: "Respons KITA AI tidak terbaca. Coba ulangi perintahmu." };
    const candidate = payload.candidates[0];
    const content = isRecord(candidate) && isRecord(candidate.content) ? candidate.content : null;
    const parts = content && Array.isArray(content.parts) ? content.parts : [];
    const callPart = parts.find((part) => isRecord(part) && isRecord(part.functionCall));
    if (isRecord(callPart) && isRecord(callPart.functionCall)) {
      const call = callPart.functionCall;
      if (typeof call.name === "string" && isRecord(call.args)) return { toolCall: { name: call.name, args: call.args } };
    }
    const reply = parts.filter((part) => isRecord(part) && typeof part.text === "string").map((part) => part.text).join("\n").trim();
    return reply ? { reply } : { error: "KITA AI belum memberi jawaban. Coba tulis perintahnya dengan lebih spesifik." };
  } catch (error) {
    console.error("AI Action Error:", error);
    return { error: "Terjadi kendala saat menghubungi KITA AI. Coba lagi sebentar." };
  }
}
