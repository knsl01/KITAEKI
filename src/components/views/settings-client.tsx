"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { changePassword, updateProfile } from "@/app/actions/profile";
import { signOut } from "@/app/actions/auth";
import { HouseholdCard } from "@/components/views/household-card";
import { PageHeader } from "@/components/page-header";
import { ThemePicker } from "@/components/theme-switcher";
import { PushManager } from "@/components/push-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { OWNER_LABEL, type MemberOwner } from "@/lib/types";

function Avatar({ name, url, className }: { name: string; url?: string | null; className?: string }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <div className={`flex items-center justify-center bg-primary text-primary-foreground font-bold rounded-full h-16 w-16 text-xl border-4 border-background shadow-sm overflow-hidden ${className}`}>
      {url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
}

export function SettingsClient({
  email,
  fullName,
  defaultOwner,
  accountCount,
  transactionCount,
  householdName,
  inviteCode,
  memberKey,
  members,
}: {
  email: string;
  fullName: string;
  defaultOwner: MemberOwner;
  accountCount: number;
  transactionCount: number;
  householdName: string;
  inviteCode: string | null;
  memberKey: MemberOwner;
  members: { user_id: string; member_key: MemberOwner; full_name: string | null; email: string | null; avatar_url: string | null }[];
}) {
  const router = useRouter();
  const [profileState, setProfileState] = useState<{ ok?: boolean; message?: string }>({});
  const [passwordState, setPasswordState] = useState<{ ok?: boolean; message?: string }>({});
  const [profilePending, startProfile] = useTransition();
  const [passwordPending, startPassword] = useTransition();

  const me = members.find(m => m.member_key === memberKey) || { full_name: fullName, email: email, avatar_url: null };
  const partner = members.find(m => m.member_key !== memberKey && m.member_key !== "shared");

  const [avatarBase64, setAvatarBase64] = useState<string | null>(me.avatar_url || null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarBase64(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      <PageHeader title="Pengaturan" description="Profil, preferensi, dan keamanan akun." />

      {/* Coupled Profile Header */}
      <div className="flex flex-col items-center justify-center p-6 bg-card border border-border rounded-xl shadow-sm mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-primary/20 to-primary/5"></div>
        <div className="flex items-center justify-center relative z-10 mb-3">
          <Avatar name={me.full_name || me.email || "?"} url={me.avatar_url} className="z-20 relative" />
          {partner && (
            <Avatar name={partner.full_name || partner.email || "?"} url={partner.avatar_url} className="-ml-4 z-10 opacity-90" />
          )}
        </div>
        <div className="text-center relative z-10">
          <h3 className="font-bold text-lg">{me.full_name || me.email}</h3>
          <p className="text-sm text-muted-foreground mb-1">Login sebagai <strong className="text-primary capitalize">{memberKey}</strong></p>
          {partner ? (
            <div className="inline-flex items-center justify-center px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-medium mt-1">
              ✨ Terhubung dengan {partner.full_name || partner.email}
            </div>
          ) : (
            <div className="inline-flex items-center justify-center px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-xs font-medium mt-1">
              Belum ada pasangan terhubung
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
        <HouseholdCard
          householdName={householdName}
          inviteCode={inviteCode}
          memberKey={memberKey}
          members={members}
        />

        <Card>
          <CardHeader>
            <CardTitle>Notifikasi</CardTitle>
            <CardDescription>Aktifkan notifikasi untuk menerima info tagihan dan aktivitas.</CardDescription>
          </CardHeader>
          <CardContent>
            <PushManager />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={(formData) =>
                startProfile(async () => {
                  if (avatarBase64) formData.set("avatar_url", avatarBase64);
                  const result = await updateProfile(formData);
                  setProfileState(
                    result.ok
                      ? { ok: true, message: "Profil tersimpan." }
                      : { ok: false, message: result.error }
                  );
                  if (result.ok) router.refresh();
                })
              }
              className="space-y-4"
            >
              <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4 mb-4">
                <Avatar name={me.full_name || me.email || "?"} url={avatarBase64} className="h-20 w-20 text-2xl" />
                <div className="space-y-1 text-center sm:text-left">
                  <Label htmlFor="avatar_upload" className="cursor-pointer inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">
                    Ubah Foto
                  </Label>
                  <input id="avatar_upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  <p className="text-xs text-muted-foreground">JPG, PNG, GIF Max 2MB.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Nama tampilan</Label>
                <Input id="full_name" name="full_name" defaultValue={fullName} placeholder="Eki" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_owner">Pemilik default transaksi</Label>
                <Select id="default_owner" name="default_owner" defaultValue={defaultOwner}>
                  {(Object.keys(OWNER_LABEL) as MemberOwner[]).map((o) => (
                    <option key={o} value={o}>
                      {OWNER_LABEL[o]}
                    </option>
                  ))}
                </Select>
              </div>

              {profileState.message ? (
                <p
                  className={
                    profileState.ok
                      ? "rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                      : "rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700"
                  }
                >
                  {profileState.message}
                </p>
              ) : null}

              <Button type="submit" disabled={profilePending}>
                {profilePending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Simpan profil
              </Button>
            </form>
          </CardContent>
        </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ganti password</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                action={(formData) =>
                  startPassword(async () => {
                    const result = await changePassword(formData);
                    setPasswordState(
                      result.ok
                        ? { ok: true, message: "Password diperbarui." }
                        : { ok: false, message: result.error }
                    );
                  })
                }
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="password">Password baru</Label>
                  <Input id="password" name="password" type="password" minLength={6} required />
                </div>

                {passwordState.message ? (
                  <p
                    className={
                      passwordState.ok
                        ? "rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                        : "rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700"
                    }
                  >
                    {passwordState.message}
                  </p>
                ) : null}

                <Button type="submit" variant="outline" disabled={passwordPending}>
                  {passwordPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Perbarui password
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gaya tampilan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Warna, huruf, dan sudut tersimpan di browser ini, jadi Eki dan Dinda bisa punya gaya sendiri-sendiri.
              </p>
              <ThemePicker />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ringkasan data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{accountCount} akun tercatat</p>
              <p>{transactionCount} transaksi tersimpan</p>
              <form action={signOut} className="pt-2">
                <Button type="submit" variant="outline">
                  Keluar dari akun
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
