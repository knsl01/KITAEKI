"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { BellRing, CalendarHeart, Flame, Heart, PiggyBank, Target, Wallet } from "lucide-react";
import { AuroraCanvas, type AuroraSignal } from "./aurora-canvas";
import { AuthCard, type AuthMode } from "./auth-card";
import "./auth.css";

type Line = { text: string; grad?: boolean };

const COPY: Record<
  AuthMode,
  { eyebrow: string; title: Line[]; lead: string; quote: string }
> = {
  signin: {
    eyebrow: "Aplikasi pribadi · Eki & Dinda",
    title: [{ text: "Satu rumah digital untuk" }, { text: "hidup berdua.", grad: true }],
    lead: "KITA adalah life hub pribadi milik Eki & Dinda — tempat uang, target tabungan, agenda, belanja, dan rencana masa depan tersimpan rapi dalam satu ruang.",
    quote: "Bukan tentang siapa yang paling cepat, tapi siapa yang tetap berjalan bersama.",
  },
  signup: {
    eyebrow: "Mulai dari sini",
    title: [{ text: "Bangun ceritanya," }, { text: "mulai dari satu akun.", grad: true }],
    lead: "Buat akun untuk masuk ke ruang bersama Eki & Dinda. Setelah masuk, hubungkan dengan pasangan lalu mulai mencatat, menabung, dan merencanakan bareng.",
    quote: "Rencana yang ditulis berdua lebih susah dilupakan.",
  },
};

const CHIPS = [
  { icon: Wallet, label: "Keuangan berdua" },
  { icon: PiggyBank, label: "Target & mimpi" },
  { icon: CalendarHeart, label: "Agenda bersama" },
];

const STEPS = [
  { t: "Buat akun", d: "Email dan password, cukup satu menit." },
  { t: "Hubungkan dengan pasangan", d: "Satu ruang untuk Eki & Dinda." },
  { t: "Catat & wujudkan target", d: "Mulai dari transaksi pertama." },
];

const TOASTS = [
  { icon: PiggyBank, text: "Dinda menabung Rp500.000" },
  { icon: Wallet, text: "Eki mencatat Makan malam · Rp85.000" },
  { icon: Target, text: "Target Liburan Jepang sudah 70%" },
  { icon: Flame, text: "Streak mencatat: 12 hari beruntun" },
];

function useCountUp(to: number, ms = 1600, deps: unknown[] = []) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return v;
}

const rp = (n: number) => "Rp" + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function Widgets() {
  const saldo = useCountUp(29723526, 1900);
  const pct = useCountUp(70, 1700);
  const [ti, setTi] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTi((i) => (i + 1) % TOASTS.length), 3400);
    return () => window.clearInterval(id);
  }, []);
  const Toast = TOASTS[ti];
  const C = 2 * Math.PI * 30;

  return (
    <div className="kx-widgets" aria-hidden>
      <div className="kx-w kx-w-balance" style={{ "--dx": -16, "--dy": -12 } as React.CSSProperties}>
        <div className="kx-w-in kx-float" style={{ animationDelay: "0s" }}>
          <span className="kx-w-label">Total saldo kita</span>
          <strong className="kx-w-amount">{rp(saldo)}</strong>
          <svg viewBox="0 0 240 64" className="kx-spark" preserveAspectRatio="none">
            <defs>
              <linearGradient id="kx-sg" x1="0" x2="1">
                <stop offset="0" stopColor="#A78BFA" />
                <stop offset="1" stopColor="#60A5FA" />
              </linearGradient>
              <linearGradient id="kx-sf" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#7C8CFF" stopOpacity=".38" />
                <stop offset="1" stopColor="#7C8CFF" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path className="kx-spark-fill" d="M0 50 C20 44 30 52 50 40 S86 34 104 38 S142 22 160 26 S206 8 240 6 L240 64 L0 64Z" fill="url(#kx-sf)" />
            <path className="kx-spark-line" d="M0 50 C20 44 30 52 50 40 S86 34 104 38 S142 22 160 26 S206 8 240 6" fill="none" stroke="url(#kx-sg)" strokeWidth="3" strokeLinecap="round" pathLength={1} />
          </svg>
          <span className="kx-w-pill">▲ +5,5% bulan ini</span>
        </div>
      </div>

      <div className="kx-w kx-w-goal" style={{ "--dx": 20, "--dy": -6 } as React.CSSProperties}>
        <div className="kx-w-in kx-float" style={{ animationDelay: "-2s" }}>
          <svg viewBox="0 0 76 76" className="kx-ring">
            <defs>
              <linearGradient id="kx-rg" x1="0" x2="1" y1="1" y2="0">
                <stop offset="0" stopColor="#8B5CF6" />
                <stop offset="1" stopColor="#60A5FA" />
              </linearGradient>
            </defs>
            <circle cx="38" cy="38" r="30" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="8" />
            <circle className="kx-ring-arc" cx="38" cy="38" r="30" fill="none" stroke="url(#kx-rg)" strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * 0.3} transform="rotate(-90 38 38)" />
            <text x="38" y="44" textAnchor="middle" className="kx-ring-text">
              {pct}%
            </text>
          </svg>
          <div>
            <span className="kx-w-label">Target</span>
            <strong className="kx-w-goal-name">Liburan Jepang</strong>
            <span className="kx-w-sub">Rp31,5 jt dari Rp45 jt</span>
          </div>
        </div>
      </div>

      <div className="kx-w kx-w-toast" style={{ "--dx": 12, "--dy": 14 } as React.CSSProperties}>
        <div className="kx-w-in kx-float" style={{ animationDelay: "-4s" }}>
          <span className="kx-toast-bell">
            <BellRing aria-hidden />
          </span>
          <div key={ti} className="kx-toast-text">
            <span className="kx-w-label">Baru saja</span>
            <strong>
              <Toast.icon aria-hidden /> {Toast.text}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthExperience() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const shellRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const signal = useRef<AuroraSignal>({ energy: 0, burst: 0, mode: 0 });

  useEffect(() => {
    signal.current.mode = mode === "signup" ? 1 : 0;
    signal.current.energy = Math.max(signal.current.energy, 1.2);
  }, [mode]);

  const onActivity = useCallback((e: number) => {
    signal.current.energy = Math.max(signal.current.energy, e);
  }, []);
  const onSuccess = useCallback(() => {
    signal.current.burst = 1;
    signal.current.energy = 2;
  }, []);

  const onPointerMove = (e: React.PointerEvent) => {
    const el = shellRef.current;
    if (!el) return;
    el.style.setProperty("--px", ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
    el.style.setProperty("--py", ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
  };

  const copy = COPY[mode];
  const words = copy.title.flatMap((l) => l.text.split(" ").map((w) => ({ w, grad: !!l.grad })));

  return (
    <div ref={shellRef} className="kx-shell" data-mode={mode} onPointerMove={onPointerMove}>
      <AuroraCanvas signal={signal} cardRef={cardRef} heroRef={heroRef} />
      <div className="kx-vignette" aria-hidden />

      <main className="kx-content">
        <section className="kx-hero" ref={heroRef} aria-labelledby="kx-title">
          <div className="kx-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" width={48} height={48} className="kx-logo" />
            <div>
              <p className="kx-brand-name">KITA</p>
              <p className="kx-brand-tag">Personal life hub</p>
            </div>
          </div>

          <div key={mode} className="kx-hero-body">
            <p className="kx-eyebrow">
              <i aria-hidden /> {copy.eyebrow}
            </p>
            <h1 id="kx-title" className="kx-title">
              {words.map((x, i) => (
                <Fragment key={i}>
                  <span className={x.grad ? "kx-word kx-grad" : "kx-word"} style={{ "--i": i } as React.CSSProperties}>
                    {x.w}
                  </span>{" "}
                </Fragment>
              ))}
            </h1>
            <p className="kx-lead">{copy.lead}</p>

            {mode === "signin" ? (
              <>
                <ul className="kx-chips">
                  {CHIPS.map(({ icon: Icon, label }, i) => (
                    <li key={label} style={{ "--i": i } as React.CSSProperties}>
                      <Icon aria-hidden /> {label}
                    </li>
                  ))}
                </ul>
                <Widgets />
              </>
            ) : (
              <ol className="kx-steps">
                {STEPS.map((s, i) => (
                  <li key={s.t} style={{ "--i": i } as React.CSSProperties}>
                    <span className="kx-step-n">{i + 1}</span>
                    <div>
                      <b>{s.t}</b>
                      <small>{s.d}</small>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <blockquote className="kx-quote">
              <Heart aria-hidden /> {copy.quote}
            </blockquote>
          </div>
        </section>

        <section className="kx-side">
          <AuthCard mode={mode} onModeChange={setMode} onActivity={onActivity} onSuccess={onSuccess} cardRef={cardRef} />
          <p className="kx-foot">Ruang pribadi Eki &amp; Dinda</p>
        </section>
      </main>
    </div>
  );
}
