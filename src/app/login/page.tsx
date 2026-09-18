import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Masuk — KITA" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between bg-sidebar px-12 py-14 text-sidebar-foreground lg:flex">
        <div>
          <p className="font-serif text-2xl tracking-tight">EKI &amp; DINDA</p>
          <p className="mt-1 text-xs tracking-[0.3em] text-sidebar-foreground/60">PERSONAL LIFE HUB</p>
        </div>

        <div className="max-w-md">
          <h1 className="font-serif text-5xl leading-[1.08] tracking-tight">
            Atur hari ini, untuk masa depan kita.
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-sidebar-foreground/70">
            Satu tempat untuk mencatat pemasukan dan pengeluaran, menjaga anggaran, dan menumbuhkan
            tabungan bersama.
          </p>

          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-white/10 pt-8 text-sm">
            <div>
              <dt className="font-medium">Keuangan</dt>
              <dd className="mt-1 text-xs leading-relaxed text-sidebar-foreground/60">
                Pemasukan, pengeluaran, transfer antar akun.
              </dd>
            </div>
            <div>
              <dt className="font-medium">Anggaran</dt>
              <dd className="mt-1 text-xs leading-relaxed text-sidebar-foreground/60">
                Batas belanja per kategori tiap bulan.
              </dd>
            </div>
            <div>
              <dt className="font-medium">Target</dt>
              <dd className="mt-1 text-xs leading-relaxed text-sidebar-foreground/60">
                Rencana jangka pendek dan panjang.
              </dd>
            </div>
          </dl>
        </div>

        <blockquote className="border-l border-white/20 pl-4 text-sm italic text-sidebar-foreground/70">
          Bukan tentang siapa yang paling cepat, tapi siapa yang tetap berjalan bersama.
        </blockquote>
      </section>

      <section className="flex items-center justify-center px-6 py-14">
        <AuthForm />
      </section>
    </main>
  );
}
