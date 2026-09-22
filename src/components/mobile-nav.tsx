"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_NAV_ITEMS, NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** Bar melayang di bawah, khusus layar kecil. */
export function MobileNav({ action, menu, items = MOBILE_NAV_ITEMS.map((item) => item.href) }: { action?: React.ReactNode; menu?: React.ReactNode; items?: readonly string[] }) {
  const pathname = usePathname();
  const [isHidden, setIsHidden] = useState(false);
  const navItems = NAV_ITEMS.filter((item) => items.includes(item.href));

  useEffect(() => {
    let lastScroll = window.scrollY;
    let timeoutId: NodeJS.Timeout;

    const onScroll = () => {
      const currentScroll = window.scrollY;
      
      // Sembunyikan saat scroll turun (minimal scroll 50px dari atas agar tidak glitch)
      if (currentScroll > lastScroll && currentScroll > 50) {
        setIsHidden(true);
      } else {
        setIsHidden(false);
      }
      
      lastScroll = currentScroll;

      // Munculkan otomatis saat berhenti scroll setelah 1.5 detik
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsHidden(false);
      }, 1500);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div 
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden transition-all duration-500 ease-out",
        isHidden ? "translate-y-32 opacity-0 scale-90" : "translate-y-0 opacity-100 scale-100"
      )}
    >
      <nav className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-card/95 p-1.5 shadow-[0_8px_30px_-12px_hsl(var(--foreground)/0.35)] backdrop-blur">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={cn(
                "relative flex h-11 items-center gap-2 rounded-full px-2.5 text-[11px] font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span
                className={cn(
                  "overflow-hidden whitespace-nowrap transition-all duration-300",
                  active ? "max-w-[6rem] opacity-100" : "max-w-0 opacity-0"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
        {menu}
        {action ? <span className="pl-0.5">{action}</span> : null}
      </nav>
    </div>
  );
}
