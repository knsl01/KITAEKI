"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, Sparkles } from "lucide-react";
import { askKitaAi } from "@/app/actions/ai";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "model" | "assistant"; content: string; isError?: boolean };

export function AiClient() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Halo! Saya KITA AI. Data pengeluaran dan pemasukan kalian bulan ini sudah saya rekap. Ada yang mau dihitung atau direncanakan hari ini?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || isTyping) return;

    const userMsg = message.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setMessage("");
    setIsTyping(true);

    const history = messages
      .filter((m) => !m.isError)
      .slice(1)
      .map((m) => ({
        role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
        parts: [{ text: m.content }]
      }));

    const res = await askKitaAi(history, userMsg);
    
    setIsTyping(false);
    
    if (res.error) {
      setMessages((prev) => [...prev, { role: "assistant", content: res.error, isError: true }]);
    } else if (res.reply) {
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-card rounded-xl border border-border overflow-hidden shadow-sm">
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
        {messages.map((m, i) => (
          <div key={i} className={cn("flex w-full", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm",
              m.role === "user" 
                ? "bg-primary text-primary-foreground rounded-br-sm" 
                : m.isError
                  ? "bg-rose-50 text-rose-700 border border-rose-200 rounded-bl-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
            )}>
              <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
            </div>
          </div>
        ))}
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
            className="flex-1 h-12 rounded-full border border-border bg-muted/50 px-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
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
