"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Award,
  CircleDollarSign,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Wallet,
  CalendarDays,
  ShieldAlert,
} from "lucide-react";
import { fetchApi, getBusinessId } from "@/lib/api";
import { isManagerRole, useSessionRole } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { cn, formatNumber, formatRupiah } from "@/lib/utils";

interface DashboardData {
  total_omzet: number;
  total_transactions: number;
  total_cogs: number;
  estimated_gross_profit: number;
  total_expenses: number;
  estimated_operating_result: number;
  best_sellers: Array<{ product_name: string; total_sold: number }>;
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Gagal memuat data dashboard.";

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:focus:border-indigo-500 dark:focus:bg-slate-950";

const labelClass =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500";

function formatPeriodDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-3 w-24" />
            <Skeleton className="mt-2 h-7 w-36" />
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <Skeleton className="h-5 w-40" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const businessId = getBusinessId();
  const sessionRole = useSessionRole();
  const isManager = isManagerRole(sessionRole);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");
  const [periodError, setPeriodError] = useState("");

  const fetchDashboard = useCallback(
    async (signal?: AbortSignal): Promise<DashboardData> => {
      if (businessId === null) {
        throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
      }

      const params = new URLSearchParams();
      if (appliedStartDate) params.set("start_date", appliedStartDate);
      if (appliedEndDate) params.set("end_date", appliedEndDate);
      const query = params.toString();

      return fetchApi(
        `/businesses/${businessId}/reports/dashboard${query ? `?${query}` : ""}`,
        { signal }
      );
    },
    [businessId, appliedStartDate, appliedEndDate]
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetchDashboard();
      setData(res);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [fetchDashboard]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    if (sessionRole !== null && !isManager) {
      return () => {
        cancelled = true;
        controller.abort();
      };
    }

    void (async () => {
      if (businessId === null) {
        setError("Sesi login tidak ditemukan. Silakan masuk kembali.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetchDashboard(controller.signal);
        if (!cancelled) setData(res);
      } catch (loadError) {
        if (cancelled) return;
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError(getErrorMessage(loadError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [businessId, fetchDashboard, isManager, sessionRole]);

  const applyPeriod = () => {
    if (startDate && endDate && startDate > endDate) {
      setPeriodError("Tanggal mulai tidak boleh setelah tanggal akhir.");
      return;
    }
    setPeriodError("");
    if (startDate === appliedStartDate && endDate === appliedEndDate) return;
    setLoading(true);
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
  };

  const resetPeriod = () => {
    setStartDate("");
    setEndDate("");
    setPeriodError("");
    if (!appliedStartDate && !appliedEndDate) return;
    setLoading(true);
    setAppliedStartDate("");
    setAppliedEndDate("");
  };

  const metrics = [
    {
      label: "Total omzet",
      value: formatRupiah(data?.total_omzet ?? 0),
      icon: TrendingUp,
      tone: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
      pill: "Pendapatan",
      pillTone: "indigo" as const,
    },
    {
      label: "Total transaksi",
      value: `${formatNumber(data?.total_transactions ?? 0)} transaksi`,
      icon: ShoppingBag,
      tone: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
      pill: "Volume",
      pillTone: "sky" as const,
    },
    {
      label: "Laba kotor",
      value: formatRupiah(data?.estimated_gross_profit ?? 0),
      icon: CircleDollarSign,
      tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
      pill: "Margin",
      pillTone: "emerald" as const,
    },
    {
      label: "Pengeluaran",
      value: formatRupiah(data?.total_expenses ?? 0),
      icon: Wallet,
      tone: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
      pill: "Biaya",
      pillTone: "rose" as const,
    },
  ];

  const bestSellers = data?.best_sellers ?? [];
  const highestSold = bestSellers.reduce((max, item) => Math.max(max, item.total_sold), 0);
  const hasPeriod = Boolean(appliedStartDate || appliedEndDate);
  const periodLabel = hasPeriod
    ? `${appliedStartDate ? formatPeriodDate(appliedStartDate) : "Awal"} – ${
        appliedEndDate ? formatPeriodDate(appliedEndDate) : "Sekarang"
      }`
    : "Semua data";

  if (sessionRole !== null && !isManager) {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Dashboard
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Ringkasan usaha
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Laporan keuangan hanya tersedia untuk owner dan manajer.
          </p>
        </div>

        <Card className="p-6">
          <EmptyState
            icon={ShieldAlert}
            title="Akses dashboard terbatas"
            description="Akun kasir dapat memproses transaksi, melihat histori penjualan, dan mengelola shift. Hubungi owner atau manajer untuk laporan keuangan."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/dashboard/pos" className={buttonStyles({ size: "sm" })}>
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Buka kasir
                </Link>
                <Link href="/dashboard/sales" className={buttonStyles({ size: "sm", variant: "outline" })}>
                  Histori penjualan
                </Link>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Dashboard
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Ringkasan usaha
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pantau performa penjualan dan kesehatan keuangan usaha Anda.
          </p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            Angka di bawah mengikuti periode yang dipilih. Tanpa filter berarti seluruh transaksi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="slate">
            <CalendarDays className="h-3 w-3" />
            {periodLabel}
          </Badge>
          <Link href="/dashboard/pos" className={buttonStyles({ size: "sm" })}>
            <ShoppingCart className="h-3.5 w-3.5" />
            Buka Kasir
          </Link>
        </div>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div>
              <label htmlFor="report-start-date" className={labelClass}>
                Dari tanggal
              </label>
              <input
                id="report-start-date"
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setPeriodError("");
                }}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="report-end-date" className={labelClass}>
                Sampai tanggal
              </label>
              <input
                id="report-end-date"
                type="date"
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setPeriodError("");
                }}
                className={inputClass}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={applyPeriod} size="md">
                Terapkan
              </Button>
              <Button type="button" onClick={resetPeriod} size="md" variant="outline">
                Reset
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {hasPeriod
              ? `Menampilkan data ${periodLabel.toLowerCase()}.`
              : "Menampilkan seluruh data tanpa batas periode."}
          </p>
        </div>
        {periodError ? (
          <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
            {periodError}
          </p>
        ) : null}
      </Card>

      {loading ? <DashboardSkeleton /> : null}

      {!loading && error ? (
        <ErrorState
          title="Dashboard gagal dimuat"
          message={error}
          onRetry={() => void loadDashboard()}
        />
      ) : null}

      {!loading && !error && data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;

              return (
                <Card
                  key={metric.label}
                  className="p-5 transition duration-150 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", metric.tone)}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <Badge tone={metric.pillTone}>{metric.pill}</Badge>
                  </div>
                  <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {metric.label}
                  </p>
                  <p className="mt-1 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {metric.value}
                  </p>
                </Card>
              );
            })}
          </div>

          <Card className="overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-600 p-0 text-white shadow-lg shadow-indigo-900/10">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-inset ring-white/20 backdrop-blur-sm">
                  <ArrowUpRight className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs font-medium text-indigo-50">
                    Hasil operasional (estimasi)
                  </p>
                  <p className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                    {formatRupiah(data.estimated_operating_result)}
                  </p>
                  <p className="mt-1 text-[11px] text-indigo-50/80">
                    Laba kotor dikurangi pengeluaran tercatat. Belum termasuk pajak,
                    penyusutan, dan biaya lain.
                  </p>
                </div>
              </div>
              <div className="flex gap-6 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-inset ring-white/15">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-indigo-100">HPP</p>
                  <p className="mt-0.5 text-sm font-bold">{formatRupiah(data.total_cogs)}</p>
                </div>
                <div className="border-l border-white/20 pl-6">
                  <p className="text-[10px] uppercase tracking-wider text-indigo-100">Laba kotor</p>
                  <p className="mt-0.5 text-sm font-bold">{formatRupiah(data.estimated_gross_profit)}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                  <Award className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Produk terlaris
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Berdasarkan jumlah unit terjual
                  </p>
                </div>
              </div>
              <Badge tone="slate">{formatNumber(bestSellers.length)} produk</Badge>
            </div>

            {bestSellers.length === 0 ? (
              <EmptyState
                compact
                icon={Award}
                title="Belum ada penjualan"
                description="Setelah transaksi pertama tercatat, produk terlaris akan muncul di sini."
                className="mt-4"
                action={
                  <Link href="/dashboard/pos" className={buttonStyles({ size: "sm" })}>
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Mulai transaksi
                  </Link>
                }
              />
            ) : (
              <div className="mt-4 space-y-2">
                {bestSellers.map((item, index) => {
                  const percentage = highestSold > 0 ? (item.total_sold / highestSold) * 100 : 0;

                  return (
                    <div
                      key={`${item.product_name}-${index}`}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/30"
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold",
                          index === 0
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                            : index === 1
                              ? "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
                              : index === 2
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"
                                : "bg-white text-slate-400 dark:bg-slate-900 dark:text-slate-500"
                        )}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {item.product_name}
                          </p>
                          <span className="shrink-0 text-xs font-bold text-slate-700 dark:text-slate-200">
                            {formatNumber(item.total_sold)} unit
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400"
                            style={{ width: `${Math.max(6, percentage)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
