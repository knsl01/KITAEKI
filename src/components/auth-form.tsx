"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn, signUp, type AuthResult } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);

  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthResult | null, FormData>(action, null);

  return (
    <div className="w-full max-w-md rounded-lg border border-border bg-card p-8">
      <div className="mb-8 text-center">
        <p className="font-serif text-xl tracking-tight">EKI &amp; DINDA</p>
        <p className="mt-1 text-[10px] tracking-[0.3em] text-muted-foreground">PERSONAL LIFE HUB</p>
      </div>

      <h1 className="font-serif text-3xl tracking-tight">
        {mode === "signin" ? "Selamat datang" : "Buat akun"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === "signin"
          ? "Masuk untuk melanjutkan ke akun kamu."
          : "Daftar untuk mulai mencatat keuangan bersama."}
      </p>

      <form action={formAction} className="mt-7 space-y-4" key={mode}>
        {mode === "signup" ? (
          <div className="space-y-2">
            <Label htmlFor="full_name">Nama</Label>
            <Input id="full_name" name="full_name" placeholder="Eki" autoComplete="name" />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="nama@email.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {state && !state.ok ? (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
        ) : null}
        {state && state.ok && state.message ? (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.message}</p>
        ) : null}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === "signin" ? "Masuk" : "Daftar"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "signin" ? "Belum punya akun? " : "Sudah punya akun? "}
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {mode === "signin" ? "Daftar di sini" : "Masuk"}
        </button>
      </p>
    </div>
  );
}
