import Link from "next/link";
import clsx from "clsx";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={clsx("flex items-center gap-2 font-black tracking-tight", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-mint text-sm text-bg">LYB</span>
      <span>
        Lift Your <span className="text-mint">Body</span>
      </span>
    </Link>
  );
}

export function IntensityDots({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="inline-flex gap-1" aria-label={`Intensité ${value} sur ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={clsx("h-2 w-2 rounded-full", i < value ? (value >= 5 ? "bg-rose" : value >= 4 ? "bg-jaune" : "bg-mint") : "bg-line")} />
      ))}
    </span>
  );
}

export function Pill({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "mint" | "jaune" | "rose" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone === "default" && "bg-line text-ink-soft",
        tone === "mint" && "bg-mint/15 text-mint",
        tone === "jaune" && "bg-jaune/15 text-jaune",
        tone === "rose" && "bg-rose/20 text-rose-soft",
      )}
    >
      {children}
    </span>
  );
}
