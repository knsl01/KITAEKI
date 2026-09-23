"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, Bot, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { askKitaAi } from "@/app/actions/ai";
import { aiExecuteTool } from "@/app/actions/ai-tools";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FinancialSummaryCard, SavingsPlanCard, TravelPlanCard } from "@/components/ui/ai-cards";

type Message = { 
  role: "user" | "model" | "assistant"; 
  content: string; 
  isError?: boolean;
  resolved?: boolean;
  toolStatus?: "done" | "failed" | "cancelled";
  toolCall?: { name: string; args: Record<string, unknown> };
};

export function AiClient() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Halo! Saya KITA AI. Data pengeluaran dan pemasukan kalian bulan ini sudah saya rekap. Ada yang mau dihitung atau direncanakan hari ini?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  function toHistory(items: Message[]) {
    const turns: { role: "user" | "model"; parts: { text: string }[] }[] = [];
    for (const item of items.slice(1)) {
      if (item.role === "user") turns.push({ role: "user", parts: [{ text: item.content }] });
      else {
        const status = item.toolStatus === "cancelled" ? "Perintah dibatalkan" : item.toolStatus === "done" ? "Perintah berhasil" : item.toolStatus === "failed" ? "Perintah gagal" : "Menunggu konfirmasi untuk perintah";
        const text = item.toolCall ? `${status} ${item.toolCall.name}: ${JSON.stringify(item.toolCall.args)}` : item.content;
        if (text) turns.push({ role: "model", parts: [{ text }] });
      }
    }
    return turns;
  }

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  async function processResponse(res: { error?: string; reply?: string; toolCall?: { name: string; args: Record<string, unknown> } }, currentMessages: Message[]) {
    if (res.error) {
      setMessages([...currentMessages, { role: "assistant", content: res.error, isError: true }]);
    } else if (res.toolCall) {
      setMessages([...currentMessages, { role: "assistant", content: "", toolCall: res.toolCall }]);
    } else if (res.reply) {
      setMessages([...currentMessages, { role: "assistant", content: res.reply }]);
    }
  }

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!message.trim() || isTyping) return;

    const userMsg = message.trim();
    const newMessages: Message[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setMessage("");
    setIsTyping(true);

    try {
      const res = await askKitaAi(toHistory(newMessages.slice(0, -1)), userMsg);
      await processResponse(res, newMessages);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "KITA AI belum bisa menjawab. Coba lagi sebentar.", isError: true }]);
    } finally {
      setIsTyping(false);
    }
  }

  async function handleExecuteTool(toolName: string, args: Record<string, unknown>, messageIndex: number) {
    setIsTyping(true);
    try {
      const result = await aiExecuteTool(toolName, args);
      setMessages((current) => [...current.map((item, index) => index === messageIndex ? { ...item, resolved: true, toolStatus: result.ok ? "done" as const : "failed" as const } : item), {
        role: "assistant",
        content: result.ok ? (result.message ?? "Perubahan berhasil disimpan.") : result.error,
        isError: !result.ok,
      }]);
      if (result.ok) router.refresh();
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "Aksi belum tersimpan. Coba lagi.", isError: true }]);
    } finally {
      setIsTyping(false);
    }
  }

  function handleCancelTool(messageIndex: number) {
    setMessages((current) => [...current.map((item, index) => index === messageIndex ? { ...item, resolved: true, toolStatus: "cancelled" as const } : item), { role: "assistant", content: "Oke, perintah dibatalkan. Tidak ada perubahan yang dibuat." }]);
  }

  const markdownComponents = {
    code({ className, children, ...props }: React.ComponentProps<"code">) {
      const match = /language-(\w+)/.exec(className || '');
      if (match && match[1] === 'json') {
        try {
          const parsed = JSON.parse(String(children).replace(/\n$/, ''));
          if (parsed.type === 'financial_summary') return <FinancialSummaryCard data={parsed.data} />;
          if (parsed.type === 'savings_plan') return <SavingsPlanCard data={parsed.data} />;
          if (parsed.type === 'travel_plan') return <TravelPlanCard data={parsed.data} />;
        } catch (e) {
          // Fallback to normal code block if parsing fails
        }
      }
      return <code className={className} {...props}>{children}</code>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-serif font-bold">
          K.
        </div>
        <div>
          <h2 className="font-bold flex items-center gap-1.5 font-serif text-lg">
            KITA AI <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500" />
          </h2>
          <p className="text-xs text-muted-foreground">Asisten Perencana Keuangan & Liburan</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => {
          if (m.toolCall && m.resolved) return null;
          return (
          <div key={i} className={cn("flex w-full", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[90%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-sm",
              m.role === "user" 
                ? "bg-primary text-primary-foreground rounded-br-sm" 
                : m.isError
                  ? "bg-rose-50 text-rose-700 border border-rose-200 rounded-bl-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
            )}>
              {m.toolCall && !m.resolved ? (
                <div className="space-y-3 text-foreground">
                  <div className="font-semibold border-b border-border pb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> Konfirmasi Aksi
                  </div>
                  <div className="text-sm">
                    KITA AI ingin melakukan aksi: <strong className="text-primary">{m.toolCall.name}</strong>
                    <div className="mt-2 rounded-md border border-border bg-background p-2 text-xs text-foreground">
                      <p>{String(m.toolCall.args.title ?? m.toolCall.args.name ?? m.toolCall.args.id ?? "Perintah")}</p>
                      {typeof m.toolCall.args.amount === "number" ? <p>Rp{m.toolCall.args.amount.toLocaleString("id-ID")}</p> : null}
                      {typeof m.toolCall.args.date === "string" ? <p>Tanggal {m.toolCall.args.date}</p> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Button size="sm" onClick={() => handleExecuteTool(m.toolCall!.name, m.toolCall!.args, i)} disabled={isTyping}>
                      <CheckCircle2 className="mr-1.5 h-4 w-4" /> Ya, Eksekusi
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleCancelTool(i)} disabled={isTyping}>
                      <XCircle className="mr-1.5 h-4 w-4" /> Batal
                    </Button>
                  </div>
                </div>
              ) : m.role === "user" ? (
                <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground prose-p:leading-relaxed prose-headings:font-serif prose-headings:font-bold prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary marker:text-primary prose-ul:my-2 prose-p:my-2 prose-pre:bg-primary/5 prose-pre:text-foreground prose-pre:border prose-pre:border-border">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{m.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        )})}
        {isTyping && (
          <div className="flex w-full justify-start">
            <div className="bg-muted text-muted-foreground rounded-2xl rounded-bl-sm px-4 py-3 text-sm flex items-center gap-2">
              <Bot className="h-4 w-4 animate-bounce" />
              <span className="animate-pulse">Sedang berpikir...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-border bg-background">
        <form onSubmit={handleSend} className="relative flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tanya soal pengeluaran atau minta saran liburan..."
            className="flex-1 h-12 rounded-full border border-border bg-muted/50 px-4 pr-12 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!message.trim() || isTyping}
            className="absolute right-1.5 h-9 w-9 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
