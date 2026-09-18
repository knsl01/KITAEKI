import { brandFor, categoryIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

/**
 * Penanda akun: kotak warna merek dengan monogram.
 * Bukan logo resmi bank — cuma warna dan inisial, supaya aman dipakai.
 */
export function BrandMarkTile({
  iconKey,
  name,
  className,
  size = "md",
}: {
  iconKey?: string | null;
  name?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const brand = brandFor(iconKey, name);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[10px] font-semibold tracking-tight text-white transition-transform duration-200",
        size === "sm" && "h-8 w-8 text-[10px]",
        size === "md" && "h-10 w-10 text-[11px]",
        size === "lg" && "h-12 w-12 text-sm",
        className
      )}
      style={{ backgroundColor: brand.color }}
      aria-hidden
    >
      {brand.short}
    </span>
  );
}

export function CategoryIconTile({
  iconKey,
  name,
  color,
  className,
  size = "md",
}: {
  iconKey?: string | null;
  name?: string | null;
  color?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = categoryIcon(iconKey, name);
  const tint = color ?? "#7A7A75";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[10px] transition-transform duration-200",
        size === "sm" && "h-8 w-8",
        size === "md" && "h-10 w-10",
        size === "lg" && "h-12 w-12",
        className
      )}
      style={{ backgroundColor: `${tint}1A`, color: tint }}
      aria-hidden
    >
      <Icon className={cn(size === "sm" ? "h-4 w-4" : size === "lg" ? "h-5 w-5" : "h-[18px] w-[18px]")} />
    </span>
  );
}
