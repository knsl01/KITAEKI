"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { Account, AccountAllocation, Category, MemberOwner, Transaction } from "@/lib/types";

/**
 * Compatibility view for older imports. Pos now belong to account cards,
 * so this view intentionally does not create/edit positions or pass categories
 * into AccountAllocationDialog.
 */
export function AllocationsOverviewClient(_props: {
  accounts: Account[];
  allocations: AccountAllocation[];
  categories: Pick<Category, "id" | "name" | "color">[];
  transactions: Pick<Transaction, "amount" | "category_id" | "account_id" | "owner">[];
  view: MemberOwner | "bersama";
  monthLabelText: string;
}) {
  return (
    <div>
      <PageHeader
        title="Pos Anggaran"
        description="Pos dikelola langsung dari akun sumbernya supaya saldo tersedia dan sisa alokasi selalu jelas."
      />
      <Card>
        <CardContent className="p-5">
          <EmptyState
            title="Kelola pos dari kartu akun"
            description="Buka halaman Akun, lalu gunakan tombol Tambah pos pada akun yang ingin dialokasikan. Klik dua kali kartu akun untuk melihat ringkasan semua posnya."
            action={
              <Button asChild>
                <Link href="/dashboard/accounts">Buka Akun <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
