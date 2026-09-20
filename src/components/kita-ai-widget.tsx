"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { askKitaAi } from "@/app/actions/ai";

type Message = { role: "user" | "model" | "assistant"; content: string; isError?: boolean };

export function KitaAiWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Halo! Saya KITA AI. Ada yang bisa saya bantu terkait rencana keuangan atau liburan kalian?" }
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

    // Siapkan history untuk API Gemini (format: { role: "user" | "model", parts: [{ text }] })
    // Kita AI Widget pakai "assistant", tapi Gemini butuh "model".
    // CATATAN PENTING: Gemini API WAJIB diawali oleh "user". Jadi pesan pertama (greeting dari AI) harus kita skip.
    const history = messages
      .filter((m) => !m.isError)
      .slice(1) // Skip the first greeting message
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
    <>
      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-20 right-4 lg:bottom-8 lg:right-8 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-300 hover:scale-110",
          isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        )}
        style={{ filter: "drop-shadow(0 0 10px hsl(var(--primary)))" }}
      >
        <Sparkles className="h-6 w-6 animate-pulse" />
      </button>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed bottom-20 right-4 lg:bottom-8 lg:right-8 z-50 flex w-[min(350px,90vw)] h-[min(500px,70vh)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl transition-all duration-300 origin-bottom-right",
          isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">KITA AI</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Online
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex w-full", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap",
                  m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"
                )}
              >
                {m.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex w-full justify-start">
              <div className="max-w-[80%] rounded-2xl bg-muted px-4 py-2 text-sm rounded-bl-sm flex gap-1">
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="border-t border-border p-3 flex gap-2 bg-background">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tanya KITA AI..."
            className="flex-1 rounded-full border border-input bg-muted/50 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
          <button
            type="submit"
            disabled={!message.trim() || isTyping}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </>
  );
}
