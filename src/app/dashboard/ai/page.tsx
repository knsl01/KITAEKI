import { AiClient } from "@/components/views/ai-client";

export const metadata = { title: "KITA AI" };

export default function AiPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-140px)] lg:h-[calc(100vh-100px)] -mt-2">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold font-serif">Asisten KITA AI</h1>
        <p className="text-muted-foreground">Analisis keuangan dan perencanaan impian kalian bersama.</p>
      </div>
      <div className="flex-1 min-h-0 relative bg-background border border-border rounded-xl overflow-hidden shadow-sm">
        <AiClient />
      </div>
    </div>
  );
}
