"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "kita-sidebar-collapsed";

export function Sidebar({ householdName }: { householdName: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      setCollapsed(false);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.sidebar = collapsed ? "collapsed" : "expanded";
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      // abaikan
    }
  }, [collapsed, ready]);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col bg-sidebar px-3 py-5 text-sidebar-foreground lg:flex",
        "transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        collapsed ? "w-[76px]" : "w-64"
      )}
    >
      <div className={cn("flex items-center gap-2 px-2", collapsed ? "justify-center" : "justify-between")}>
        <div className={cn("overflow-hidden", collapsed ? "w-0" : "w-36")}>
          <img src="/kita-logo.png" alt="KITA" width={142} height={49} className="mx-auto block h-auto w-36 max-w-none object-contain" />
          <p className="mt-1 truncate text-center text-xs text-sidebar-foreground/55">{householdName}</p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Lebarkan menu" : "Ciutkan menu"}
          className="rounded-md p-2 text-sidebar-foreground/60 transition-colors duration-200 hover:bg-white/10 hover:text-sidebar-foreground"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="mt-7 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                collapsed && "justify-center px-0",
                active
                  ? "bg-white/10 font-semibold text-white"
                  : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110" />
              <span
                className={cn(
                  "truncate transition-all duration-200",
                  collapsed && "pointer-events-none w-0 opacity-0"
                )}
              >
                {item.label}
              </span>
              {active ? <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-white/70" /> : null}
            </Link>
          );
        })}
      </nav>

      <form action={signOut} className="mt-3 border-t border-white/10 pt-3">
        <button
          type="submit"
          title={collapsed ? "Keluar" : undefined}
          className={cn(
            "icon-slide flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-white/5 hover:text-sidebar-foreground",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          <span className={cn(collapsed && "pointer-events-none w-0 opacity-0")}>Keluar</span>
        </button>
      </form>
    </aside>
  );
}
