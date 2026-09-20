"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Bot, CheckCircle2, XCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { askKitaAi } from "@/app/actions/ai";
import { aiExecuteTool } from "@/app/actions/ai-tools";
import { Button } from "@/components/ui/button";
import { FinancialSummaryCard, SavingsPlanCard, TravelPlanCard } from "@/components/ui/ai-cards";

type Message = { 
  role: "user" | "model" | "assistant"; 
  content: string; 
  isError?: boolean;
  toolCall?: { name: string; args: any };
  toolResult?: { name: string; result: any };
};

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
  }, [messages, isTyping, isOpen]);

  async function processResponse(res: any, currentMessages: Message[]) {
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

    const history = newMessages.slice(1).map((m) => ({
      role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
      parts: [{ text: m.content }],
      toolCall: m.toolCall,
      toolResult: m.toolResult,
    }));

    const res = await askKitaAi(history, userMsg);
    setIsTyping(false);
    await processResponse(res, newMessages);
  }

  async function handleExecuteTool(toolName: string, args: any) {
    setIsTyping(true);
    const result = await aiExecuteTool(toolName, args);
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: "Sistem: Aksi dikonfirmasi.", toolResult: { name: toolName, result } }
    ];
    setMessages(newMessages);
    
    const history = newMessages.slice(1).map((m) => ({
      role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
      parts: [{ text: m.content }],
      toolCall: m.toolCall,
      toolResult: m.toolResult,
    }));
    
    const res = await askKitaAi(history, "");
    setIsTyping(false);
    await processResponse(res, newMessages);
  }

  async function handleCancelTool(toolName: string) {
    setIsTyping(true);
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: "Sistem: User batal.", toolResult: { name: toolName, result: "Cancelled" } }
    ];
    setMessages(newMessages);
    
    const history = newMessages.slice(1).map((m) => ({
      role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
      parts: [{ text: m.content }],
      toolCall: m.toolCall,
      toolResult: m.toolResult,
    }));
    
    const res = await askKitaAi(history, "");
    setIsTyping(false);
    await processResponse(res, newMessages);
  }

  const markdownComponents: any = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      if (!inline && match && match[1] === 'json') {
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
    <>
      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-300 hover:scale-110",
          isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        )}
        style={{ filter: "drop-shadow(0 0 10px hsl(var(--primary)))" }}
      >
        <Sparkles className="h-6 w-6 animate-pulse" />
      </button>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-50 flex w-[min(350px,90vw)] h-[min(500px,70vh)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl transition-all duration-300 origin-bottom-right",
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
          {messages.map((m, i) => {
            if (m.toolResult) return null; // Sembunyikan pesan sistem dari UI

            return (
            <div key={i} className={cn("flex w-full", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[90%] rounded-2xl px-4 py-3 text-sm",
                  m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"
                )}
              >
                {m.toolCall ? (
                  <div className="space-y-3 text-foreground">
                    <div className="font-semibold border-b border-border pb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> Konfirmasi
                    </div>
                    <div className="text-xs">
                      Aksi: <strong className="text-primary">{m.toolCall.name}</strong>
                      <pre className="mt-2 p-2 bg-background rounded-md border border-border text-[10px] overflow-x-auto text-foreground">
                        {JSON.stringify(m.toolCall.args, null, 2)}
                      </pre>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Button size="sm" onClick={() => handleExecuteTool(m.toolCall!.name, m.toolCall!.args)} disabled={isTyping} className="h-7 text-xs px-2">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Ya
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleCancelTool(m.toolCall!.name)} disabled={isTyping} className="h-7 text-xs px-2">
                        <XCircle className="mr-1 h-3 w-3" /> Batal
                      </Button>
                    </div>
                  </div>
                ) : m.role === "user" ? (
                  <div className="whitespace-pre-wrap">{m.content}</div>
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
            className="flex-1 rounded-full border border-input bg-muted/50 px-4 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
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
