"use server";

export async function askKitaAi(history: { role: "user" | "model"; parts: { text: string }[] }[], prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return {
      error: "Kunci API (GEMINI_API_KEY) belum dikonfigurasi. Silakan tambahkan di .env.local kamu.",
    };
  }

  try {
    const contents = [...history, { role: "user", parts: [{ text: prompt }] }];
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            role: "system",
            parts: [{ text: "Kamu adalah KITA AI, asisten keuangan dan perencanaan cerdas untuk aplikasi KITA (digunakan oleh pasangan). Berbicaralah dengan nada santai, ramah, suportif, dan bahasa Indonesia gaul tapi sopan. Fokus pada memberikan saran keuangan, menabung, atau ide liburan." }]
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
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
