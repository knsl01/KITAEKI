"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-sidebar px-4 py-6 text-sidebar-foreground lg:flex">
      <div className="px-3">
        <p className="font-serif text-2xl leading-none tracking-tight">KITA.</p>
        <p className="mt-1 text-xs text-sidebar-foreground/55">Eki &amp; Dinda</p>
      </div>

      <nav className="mt-8 flex-1 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-200",
                active
                  ? "bg-white/10 font-medium text-white"
                  : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
              {item.label}
              {active ? (
                <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-white/70" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <form action={signOut} className="mt-4 border-t border-white/10 pt-4">
        <button
          type="submit"
          className="icon-slide flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-white/5 hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </form>
    </aside>
  );
}
