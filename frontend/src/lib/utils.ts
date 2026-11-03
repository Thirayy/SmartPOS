export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatRupiah(value: number | string) {
  const numeric = typeof value === "number" ? value : Number(value);
  return rupiahFormatter.format(Number.isFinite(numeric) ? numeric : 0);
}

export function formatNumber(value: number | string) {
  const numeric = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat("id-ID").format(Number.isFinite(numeric) ? numeric : 0);
}

export function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "PR";
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

const productTones = [
  "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
  "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
];

export function getProductTone(name: string) {
  const hash = Array.from(name).reduce((total, char) => total + char.charCodeAt(0), 0);
  return productTones[hash % productTones.length];
}
