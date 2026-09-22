import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { WidgetFrame } from "@/components/dashboard/widget-frame";

export function PageShortcutWidget({ title, description, href, icon: Icon }: { title: string; description: string; href: string; icon: LucideIcon }) {
  return <WidgetFrame title={title}>
    <Link href={href} className="group flex h-full min-h-0 items-center gap-3 rounded-xl border border-border/70 bg-background/40 p-3 transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" aria-hidden /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Buka {title}</span><span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">{description}</span></span>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
    </Link>
  </WidgetFrame>;
}
