import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "teal" | "amber" | "rose" | "slate" | "emerald" | "sky";

const toneStyles: Record<BadgeTone, string> = {
  teal: "bg-teal-50 text-teal-700 ring-teal-600/10 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-400/20",
  emerald:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  amber:
    "bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20",
  rose: "bg-rose-50 text-rose-700 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20",
  slate:
    "bg-slate-100 text-slate-600 ring-slate-500/10 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/20",
  sky: "bg-sky-50 text-sky-700 ring-sky-600/10 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = "slate", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
        toneStyles[tone],
        className
      )}
      {...props}
    />
  );
}
