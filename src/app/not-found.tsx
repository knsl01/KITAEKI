import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="font-serif text-2xl">Halaman tidak ditemukan</h1>
      <p className="text-sm text-muted-foreground">Alamat yang kamu buka tidak ada di KITA.</p>
      <Button asChild className="mt-2">
        <Link href="/dashboard">Kembali ke dashboard</Link>
      </Button>
    </div>
  );
}
