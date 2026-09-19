"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { LogOut, Menu, X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

/**
 * Sidebar untuk layar kecil: meluncur dari kiri dan isinya sama dengan sidebar desktop.
 * Dibuka lewat tombol "Menu" di topbar atau ikon menu di bar bawah (`variant`).
 */
export function MobileMenu({
  householdName,
  variant = "topbar",
}: {
  householdName: string;
  variant?: "topbar" | "nav";
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Pindah halaman dengan cara apa pun → menu menutup sendiri
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        {variant === "topbar" ? (
          <button
            type="button"
            aria-label="Buka menu"
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-muted px-3 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 lg:hidden"
          >
            <Menu className="h-[18px] w-[18px]" aria-hidden />
            Menu
          </button>
        ) : (
          <button
            type="button"
            aria-label="Buka menu"
            className="flex h-11 w-[2.625rem] shrink-0 items-center justify-center rounded-full text-muted-foreground transition-all duration-300 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
          >
            <Menu className="h-[18px] w-[18px]" aria-hidden />
          </button>
        )}
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 duration-300 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 lg:hidden" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[min(20rem,86vw)] flex-col bg-sidebar px-3 text-sidebar-foreground shadow-2xl outline-none lg:hidden",
            "pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]",
            "duration-300 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
          )}
        >
          <div className="flex items-start justify-between gap-3 px-2">
            <div className="min-w-0">
              <DialogPrimitive.Title className="font-serif text-2xl font-extrabold leading-none tracking-tight">
                KITA.
              </DialogPrimitive.Title>
              <p className="mt-1 truncate text-xs text-sidebar-foreground/60">{householdName}</p>
            </div>
            <DialogPrimitive.Close
              aria-label="Tutup menu"
              className="-mr-1 rounded-md p-2 text-sidebar-foreground/70 transition-colors hover:bg-white/10 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <X className="h-5 w-5" aria-hidden />
            </DialogPrimitive.Close>
          </div>

          <nav aria-label="Menu utama" className="mt-6 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] transition-colors duration-200",
                    active
                      ? "bg-white/10 font-semibold text-white"
                      : "text-sidebar-foreground/75 hover:bg-white/5 hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden />
                  <span className="truncate">{item.label}</span>
                  {active ? <span className="absolute inset-y-2.5 left-0 w-0.5 rounded-full bg-white/70" /> : null}
                </Link>
              );
            })}
          </nav>

          <form action={signOut} className="mt-3 border-t border-white/10 pt-3">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-[15px] text-sidebar-foreground/75 transition-colors hover:bg-white/5 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <LogOut className="h-5 w-5 shrink-0" aria-hidden />
              Keluar
            </button>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
