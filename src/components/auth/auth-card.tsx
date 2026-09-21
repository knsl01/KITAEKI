"use client";

import { useActionState, useEffect, useMemo, useState, type ReactNode, type RefObject } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, MailCheck, User } from "lucide-react";
import { signIn, signUp, type AuthResult } from "@/app/actions/auth";

export type AuthMode = "signin" | "signup";

type Props = {
  mode: AuthMode;
  onModeChange: (m: AuthMode) => void;
  /** Dipanggil saat user aktif (mengetik, kirim) — dipakai untuk "menyalakan" latar. */
  onActivity: (energy: number) => void;
  onSuccess: () => void;
  cardRef: RefObject<HTMLDivElement | null>;
};

function Field({
  id,
  label,
  icon,
  right,
  ...input
}: {
  id: string;
  label: string;
  icon: ReactNode;
  right?: ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="kx-field">
      <input id={id} placeholder=" " {...input} className="kx-input" />
      <span className="kx-field-icon" aria-hidden>
        {icon}
      </span>
      <label htmlFor={id} className="kx-label">
        {label}
      </label>
      {right}
      <span className="kx-field-glow" aria-hidden />
    </div>
  );
}

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]|[a-z]/i.test(pw)) s++;
  return Math.min(4, s);
}
const STRENGTH_LABEL = ["", "Lemah", "Cukup", "Bagus", "Kuat"];

function FormBody({ mode, onActivity, onSuccess, onModeChange }: Omit<Props, "cardRef">) {
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthResult | null, FormData>(action, null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [shake, setShake] = useState(0);
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);

  const score = useMemo(() => strength(password), [password]);
  const signupDone = mode === "signup" && state?.ok === true;

  useEffect(() => {
    if (pending) onActivity(1.8);
  }, [pending, onActivity]);

  useEffect(() => {
    if (!state) return;
    if (state.ok) onSuccess();
    else setShake((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (signupDone && state?.ok) {
    return (
      <div className="kx-done" role="status">
        <span className="kx-done-icon">
          <MailCheck aria-hidden />
        </span>
        <h3>Akun berhasil dibuat</h3>
        <p>{state.message ?? "Cek email kamu untuk konfirmasi, lalu masuk."}</p>
        <button type="button" className="kx-btn" onClick={() => onModeChange("signin")}>
          <span>Lanjut ke halaman masuk</span>
          <ArrowRight aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="kx-form" noValidate={false}>
      {mode === "signup" && (
        <Field
          id="full_name"
          name="full_name"
          label="Nama panggilan"
          icon={<User />}
          autoComplete="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            onActivity(0.5);
          }}
        />
      )}

      <Field
        id="email"
        name="email"
        type="email"
        inputMode="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        label="Email"
        icon={<Mail />}
        autoComplete="email"
        required
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          onActivity(0.5);
        }}
      />

      <Field
        id="password"
        name="password"
        type={show ? "text" : "password"}
        label="Password"
        icon={<Lock />}
        autoComplete={mode === "signin" ? "current-password" : "new-password"}
        required
        minLength={mode === "signup" ? 6 : undefined}
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          onActivity(0.6);
        }}
        onKeyUp={(e) => setCaps(e.getModifierState?.("CapsLock") ?? false)}
        onBlur={() => setCaps(false)}
        right={
          <button type="button" className="kx-eye" onClick={() => setShow((v) => !v)} aria-label={show ? "Sembunyikan password" : "Tampilkan password"}>
            {show ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </button>
        }
      />

      {caps && <p className="kx-hint">Caps Lock sedang aktif</p>}

      {mode === "signup" && password.length > 0 && (
        <div className="kx-strength" aria-live="polite">
          <div className="kx-strength-bars" data-score={score}>
            {[1, 2, 3, 4].map((n) => (
              <i key={n} data-on={score >= n} />
            ))}
          </div>
          <span>{score === 0 ? "Minimal 6 karakter" : `Kekuatan: ${STRENGTH_LABEL[score]}`}</span>
        </div>
      )}

      {state && !state.ok && (
        <p className="kx-alert" role="alert" key={shake}>
          {state.error}
        </p>
      )}

      <button
        type="submit"
        className="kx-btn"
        disabled={pending}
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setRipple({ x: e.clientX - r.left, y: e.clientY - r.top, id: Date.now() });
        }}
      >
        {ripple && <i className="kx-ripple" key={ripple.id} style={{ left: ripple.x, top: ripple.y }} />}
        {pending ? <Loader2 className="kx-spin" aria-hidden /> : null}
        <span>{pending ? (mode === "signin" ? "Membuka ruang kita…" : "Membuat akun…") : mode === "signin" ? "Masuk" : "Daftar sekarang"}</span>
        {!pending && <ArrowRight aria-hidden />}
      </button>
    </form>
  );
}

export function AuthCard(props: Props) {
  const { mode, onModeChange, cardRef } = props;

  const spot = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <div className="kx-card-wrap" ref={cardRef} onPointerMove={spot}>
      <div className="kx-card">
        <div className="kx-tabs" role="tablist" aria-label="Masuk atau daftar" data-mode={mode}>
          <i className="kx-tab-ind" aria-hidden />
          <button type="button" role="tab" id="tab-signin" aria-selected={mode === "signin"} onClick={() => onModeChange("signin")}>
            Masuk
          </button>
          <button type="button" role="tab" id="tab-signup" aria-selected={mode === "signup"} onClick={() => onModeChange("signup")}>
            Daftar
          </button>
        </div>

        <div key={mode} className="kx-card-body" role="tabpanel" aria-labelledby={mode === "signin" ? "tab-signin" : "tab-signup"}>
          <h2 className="kx-card-title">{mode === "signin" ? "Selamat datang kembali" : "Buat akun baru"}</h2>
          <p className="kx-card-sub">
            {mode === "signin" ? "Masuk untuk lanjut ke ruang kita berdua." : "Daftar dulu, nanti hubungkan dengan pasangan di dalam."}
          </p>
          <FormBody {...props} />
        </div>

        <p className="kx-switch">
          {mode === "signin" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
          <button type="button" onClick={() => onModeChange(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "Daftar di sini" : "Masuk"}
          </button>
        </p>
      </div>
    </div>
  );
}
