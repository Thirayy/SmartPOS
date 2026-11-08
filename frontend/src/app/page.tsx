import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  LayoutDashboard,
  Package,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const featureCards = [
  {
    title: "Kasir yang cepat",
    description:
      "Cari produk, atur jumlah, dan selesaikan pembayaran tunai atau transfer dalam hitungan detik.",
    icon: ShoppingCart,
    tone: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
  },
  {
    title: "Laporan ringkas",
    description:
      "Omzet, laba kotor, dan estimasi hasil operasional tersaji rapi tanpa menghitung manual.",
    icon: BarChart3,
    tone: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  },
  {
    title: "Stok terkendali",
    description:
      "Pantau ketersediaan produk dan dapatkan peringatan saat stok mulai menipis.",
    icon: Package,
    tone: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  },
  {
    title: "Biaya tercatat",
    description:
      "Catat pengeluaran operasional agar estimasi hasil operasional usaha lebih terukur.",
    icon: Wallet,
    tone: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  },
];

const highlights = [
  "Berbasis web, tanpa instalasi di perangkat",
  "Riwayat transaksi tersimpan",
  "Dirancang untuk laptop & tablet",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm shadow-teal-600/20">
              <Store className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-extrabold tracking-tight">SmartPOS</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                UMKM Master
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-500 dark:text-slate-400 md:flex">
            <a href="#fitur" className="transition hover:text-slate-900 dark:hover:text-white">
              Fitur
            </a>
            <a href="#alur" className="transition hover:text-slate-900 dark:hover:text-white">
              Cara kerja
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/auth/login"
              className="hidden h-9 items-center gap-2 rounded-xl bg-teal-600 px-4 text-xs font-bold text-white shadow-sm shadow-teal-600/20 transition hover:bg-teal-700 active:scale-[0.98] dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 sm:flex"
            >
              Masuk Sistem
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-teal-200/40 blur-3xl dark:bg-teal-500/10" />
          <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-500/10" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div>
              <Badge tone="teal" className="px-3 py-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                POS modern untuk UMKM
              </Badge>

              <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[1.08] tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
                Kelola toko lebih rapi,{" "}
                <span className="bg-gradient-to-r from-teal-600 to-emerald-500 bg-clip-text text-transparent dark:from-teal-400 dark:to-emerald-300">
                  tanpa ribet.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-400">
                SmartPOS membantu pemilik usaha mencatat transaksi, memantau stok, dan memahami
                keuangan dalam satu dashboard yang sederhana dan cepat.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/auth/login"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-bold text-white shadow-sm shadow-teal-600/20 transition hover:bg-teal-700 active:scale-[0.98] dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Mulai Kasir (Login)
                </Link>
                <Link
                  href="/auth/register"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Daftar Akun Baru
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
                {highlights.map((item) => (
                  <span
                    key={item}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-x-6 -bottom-4 h-24 rounded-3xl bg-teal-600/10 blur-xl dark:bg-teal-500/10" />
              <Card className="relative overflow-hidden rounded-3xl p-4 shadow-xl shadow-slate-900/10 sm:p-5">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
                      <Store className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        Toko Sinar Jaya
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        Contoh tampilan kasir
                      </p>
                    </div>
                  </div>
                  <Badge tone="amber">
                    Ilustrasi
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px]">
                  <div className="space-y-2">
                    {[
                      { name: "Kopi Susu Gula Aren", price: "Rp 18.000", qty: 2, initial: "KS" },
                      { name: "Es Teh Manis", price: "Rp 8.000", qty: 1, initial: "ET" },
                      { name: "Roti Bakar Cokelat", price: "Rp 15.000", qty: 1, initial: "RB" },
                    ].map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-800/30"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-[10px] font-extrabold text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                          {item.initial}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            {item.qty} × {item.price}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 p-3.5 text-white">
                    <div>
                      <p className="text-[10px] text-teal-50">Total bayar</p>
                      <p className="mt-1 text-lg font-black leading-tight">Rp 59.000</p>
                      <p className="mt-3 text-[10px] text-teal-50/80">Tunai · Uang pas</p>
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-white/15 py-2 text-[10px] font-bold ring-1 ring-inset ring-white/20">
                      <CheckCircle2 className="h-3 w-3" />
                      Pembayaran tunai diterima
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-slate-200 px-3 py-2 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    Stok otomatis diperbarui
                  </span>
                  <ShieldCheck className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section id="fitur" className="border-y border-slate-200/80 bg-white/60 py-16 dark:border-slate-800/80 dark:bg-slate-900/30 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
                Semua yang Anda butuhkan
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Satu aplikasi untuk operasional toko
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Dirancang agar mudah dipakai pemula, tanpa mengorbankan kontrol atas bisnis Anda.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featureCards.map(({ title, description, icon: Icon, tone }) => (
                <Card
                  key={title}
                  className="p-5 transition duration-150 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="alur" className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
                  Alur sederhana
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  Dari jualan sampai laporan
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Tiga langkah yang bisa langsung dipahami tim kasir baru sekalipun.
                </p>
                <Link
                  href="/auth/login"
                  className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Mulai sekarang
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="space-y-3">
                {[
                  {
                    step: "01",
                    title: "Pilih produk",
                    description: "Cari produk dengan cepat atau saring berdasarkan stok.",
                  },
                  {
                    step: "02",
                    title: "Terima pembayaran",
                    description: "Pilih tunai atau transfer, sistem menghitung kembalian otomatis.",
                  },
                  {
                    step: "03",
                    title: "Pantau hasilnya",
                    description: "Stok berkurang dan laporan keuangan langsung diperbarui.",
                  },
                ].map((item) => (
                  <Card key={item.step} className="flex items-start gap-4 p-4 sm:p-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-sm font-black text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                      {item.step}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {item.description}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/60 py-8 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
              <Store className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              SmartPOS UMKM
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Dibuat untuk membantu usaha kecil tumbuh lebih teratur.
          </p>
        </div>
      </footer>
    </div>
  );
}