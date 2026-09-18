import { AuthForm } from "@/components/auth-form";
import { LoginScene } from "@/components/login-scene";

export const metadata = { title: "Masuk" };

const HIGHLIGHTS = [
  { title: "Keuangan", body: "Pemasukan, pengeluaran, dan transfer antar akun dalam satu catatan." },
  { title: "Rencana", body: "Anggaran bulanan, target tabungan, dan tagihan rutin yang tak terlewat." },
  { title: "Bersama", body: "Satu workspace untuk berdua, dengan catatan milik siapa yang jelas." },
];

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden text-white lg:block">
        <LoginScene />

        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="page-enter">
            <p className="font-serif text-2xl tracking-tight">KITA.</p>
            <p className="mt-1 text-xs tracking-[0.28em] text-white/50">PERSONAL LIFE HUB</p>
          </div>

          <div className="max-w-md">
            <h1 className="page-enter font-serif text-5xl leading-[1.06] tracking-tight">
              Atur hari ini, untuk masa depan kita.
            </h1>

            <dl className="stagger mt-10 space-y-5 border-t border-white/15 pt-8">
              {HIGHLIGHTS.map((item) => (
                <div key={item.title} className="flex gap-4">
                  <dt className="w-24 shrink-0 text-sm font-medium">{item.title}</dt>
                  <dd className="text-sm leading-relaxed text-white/60">{item.body}</dd>
                </div>
              ))}
            </dl>
          </div>

          <blockquote className="page-enter border-l border-white/20 pl-4 text-sm italic text-white/60">
            Bukan tentang siapa yang paling cepat, tapi siapa yang tetap berjalan bersama.
          </blockquote>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-14">
        <AuthForm />
      </section>
    </main>
  );
}
