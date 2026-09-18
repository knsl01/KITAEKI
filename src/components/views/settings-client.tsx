"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { changePassword, updateProfile } from "@/app/actions/profile";
import { signOut } from "@/app/actions/auth";
import { HouseholdCard } from "@/components/views/household-card";
import { PageHeader } from "@/components/page-header";
import { ThemePicker } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { OWNER_LABEL, type MemberOwner } from "@/lib/types";

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
  members: { user_id: string; member_key: MemberOwner; full_name: string | null; email: string | null }[];
}) {
  const router = useRouter();
  const [profileState, setProfileState] = useState<{ ok?: boolean; message?: string }>({});
  const [passwordState, setPasswordState] = useState<{ ok?: boolean; message?: string }>({});
  const [profilePending, startProfile] = useTransition();
  const [passwordPending, startPassword] = useTransition();

  return (
    <div>
      <PageHeader title="Pengaturan" description="Profil, preferensi, dan keamanan akun." />

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
            <CardTitle>Profil</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={(formData) =>
                startProfile(async () => {
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
              <CardTitle>Tema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Pilihan warna tersimpan di browser ini, jadi Eki dan Dinda bisa pakai tema berbeda.
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
