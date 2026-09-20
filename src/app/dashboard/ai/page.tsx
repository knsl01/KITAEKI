import { AiClient } from "@/components/views/ai-client";

export const metadata = { title: "KITA AI" };

export default function AiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif">Asisten KITA AI</h1>
        <p className="text-muted-foreground">Analisis keuangan dan perencanaan impian kalian bersama.</p>
      </div>
      <AiClient />
    </div>
  );
}
