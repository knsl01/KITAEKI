"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2 } from "lucide-react";
import { joinHousehold, renameHousehold, setMemberKey } from "@/app/actions/workspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { OWNER_LABEL, type MemberOwner } from "@/lib/types";
import { cn } from "@/lib/utils";

type Member = { user_id: string; member_key: MemberOwner; full_name: string | null; email: string | null };

export function HouseholdCard({
  householdName,
  inviteCode,
  memberKey,
  members,
}: {
  householdName: string;
  inviteCode: string | null;
  memberKey: MemberOwner;
  members: Member[];
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, okText: string) {
    start(async () => {
      setMessage(null);
      const result = await fn();
      setMessage(result.ok ? { ok: true, text: okText } : { ok: false, text: result.error });
      if (result.ok) router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace bersama</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <form
          action={(formData) => run(() => renameHousehold(formData), "Nama workspace tersimpan.")}
          className="space-y-2"
        >
          <Label htmlFor="name">Nama workspace</Label>
          <div className="flex gap-2">
            <Input id="name" name="name" defaultValue={householdName} />
            <Button type="submit" variant="outline" disabled={pending}>
              Simpan
            </Button>
          </div>
        </form>

        <div className="space-y-2">
          <Label>Saya di workspace ini</Label>
          <Select
            defaultValue={memberKey}
            onChange={(e) => run(() => setMemberKey(e.target.value as MemberOwner), "Peran diperbarui.")}
            disabled={pending}
          >
            <option value="eki">{OWNER_LABEL.eki}</option>
            <option value="dinda">{OWNER_LABEL.dinda}</option>
          </Select>
          <p className="text-xs text-muted-foreground">
            Menentukan nama yang muncul di switcher dashboard dan pemilik default transaksi baru.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Kode undangan</Label>
          <div className="flex gap-2">
            <Input value={inviteCode ?? "—"} readOnly className="font-mono tracking-widest" />
            <Button
              type="button"
              variant="outline"
              className="icon-lift"
              disabled={!inviteCode}
              onClick={() => {
                if (!inviteCode) return;
                void navigator.clipboard.writeText(inviteCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Tersalin" : "Salin"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Bagikan kode ini ke pasangan. Dia daftar akun sendiri, lalu memasukkan kode di bawah untuk gabung ke
            data yang sama.
          </p>
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-sm font-medium">Anggota</p>
          <ul className="space-y-1.5">
            {members.map((member) => (
              <li key={member.user_id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{member.full_name || member.email || "Anggota"}</span>
                <span className="text-xs text-muted-foreground">{OWNER_LABEL[member.member_key]}</span>
              </li>
            ))}
            {members.length < 2 ? (
              <li className="text-xs text-muted-foreground">Pasangan belum bergabung.</li>
            ) : null}
          </ul>
        </div>

        <form
          action={(formData) => run(() => joinHousehold(formData), "Berhasil gabung ke workspace.")}
          className="space-y-2 border-t border-border pt-4"
        >
          <Label htmlFor="invite_code">Gabung ke workspace pasangan</Label>
          <div className="flex gap-2">
            <Input id="invite_code" name="invite_code" placeholder="kode undangan" className="font-mono" />
            <Select name="member_key" defaultValue="dinda" className="w-36">
              <option value="dinda">{OWNER_LABEL.dinda}</option>
              <option value="eki">{OWNER_LABEL.eki}</option>
            </Select>
            <Button type="submit" variant="outline" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Gabung
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Data yang sudah kamu buat sebelumnya ikut dipindahkan ke workspace tujuan.
          </p>
        </form>

        {message ? (
          <p
            className={cn(
              "rounded-md px-3 py-2 text-sm",
              message.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            )}
          >
            {message.text}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
