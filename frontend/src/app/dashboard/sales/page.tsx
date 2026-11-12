"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  History,
  RefreshCw,
  RotateCcw,
  Search,
  User,
} from "lucide-react";
import type { SaleResponse } from "@/types/sales";
import { fetchApi, getBusinessId } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { isManagerRole, useSessionRole } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { cn, formatRupiah } from "@/lib/utils";

type FilterState = {
  startDate: string;
  endDate: string;
  paymentMethod: string;
  status: string;
};

const emptyFilters: FilterState = {
  startDate: "",
  endDate: "",
  paymentMethod: "ALL",
  status: "ALL",
};

const PAGE_SIZE = 100;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Gagal memuat histori transaksi.";

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:bg-slate-950";

const labelClass =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500";

const paymentLabels: Record<string, string> = {
  CASH: "Tunai",
  TRANSFER: "Transfer",
  QRIS: "QRIS",
};

function SalesSkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

export default function SalesHistoryPage() {
  const businessId = getBusinessId();
  const sessionRole = useSessionRole();
  const canCancel = isManagerRole(sessionRole);

  const [salesHistory, setSalesHistory] = useState<SaleResponse[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleResponse | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [offset, setOffset] = useState(0);

  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(emptyFilters);
  const [filterError, setFilterError] = useState("");

  const [cancelTarget, setCancelTarget] = useState<{ sale: SaleResponse; mode: "cancel" | "return" } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    if (appliedFilters.startDate) params.set("start_date", appliedFilters.startDate);
    if (appliedFilters.endDate) params.set("end_date", appliedFilters.endDate);
    if (appliedFilters.paymentMethod !== "ALL") params.set("payment_method", appliedFilters.paymentMethod);
    if (appliedFilters.status !== "ALL") params.set("status", appliedFilters.status);
    return params.toString();
  }, [appliedFilters, offset]);

  const fetchSalesHistory = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError("");

    try {
      if (businessId === null) {
        throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
      }

      const data = (await fetchApi(
        `/businesses/${businessId}/sales/?${queryString}`
      )) as SaleResponse[];
      const list = Array.isArray(data) ? data : [];
      setSalesHistory(list);
      setSelectedSale((current) => {
        if (current) {
          const updated = list.find((sale) => sale.id === current.id);
          if (updated) return updated;
        }
        return list[0] ?? null;
      });
    } catch (error) {
      setHistoryError(getErrorMessage(error));
      setSalesHistory([]);
      setSelectedSale(null);
    } finally {
      setLoadingHistory(false);
    }
  }, [businessId, queryString]);

  useEffect(() => {
    void (async () => {
      await fetchSalesHistory();
    })();
  }, [fetchSalesHistory]);

  const applyFilters = () => {
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      setFilterError("Tanggal mulai tidak boleh setelah tanggal akhir.");
      return;
    }
    setFilterError("");
    setOffset(0);
    setSuccessMessage("");
    setAppliedFilters({ ...filters });
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setFilterError("");
    setOffset(0);
    setSuccessMessage("");
  };

  const openCancelModal = (sale: SaleResponse, mode: "cancel" | "return") => {
    setCancelTarget({ sale, mode });
    setCancelReason("");
    setCancelError("");
    setSuccessMessage("");
  };

  const handleCancel = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cancelTarget) return;

    if (cancelReason.trim().length < 3) {
      setCancelError("Alasan minimal 3 karakter.");
      return;
    }

    setCancelling(true);
    setCancelError("");

    try {
      if (businessId === null) {
        throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
      }
      const action = cancelTarget.mode === "cancel" ? "cancel" : "return";
      await fetchApi(`/businesses/${businessId}/sales/${cancelTarget.sale.id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      setSuccessMessage(
        cancelTarget.mode === "cancel"
          ? `Transaksi ${cancelTarget.sale.transaction_number} dibatalkan dan stok dikembalikan.`
          : `Retur transaksi ${cancelTarget.sale.transaction_number} tercatat dan stok dikembalikan.`
      );
      setCancelTarget(null);
      await fetchSalesHistory();
    } catch (cancelFailure) {
      setCancelError(getErrorMessage(cancelFailure));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Penjualan
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Histori transaksi
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pantau transaksi, filter periode, dan proses pembatalan atau retur.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => void fetchSalesHistory()}
          disabled={loadingHistory}
        >
          <RefreshCw className={cn("h-4 w-4", loadingHistory && "animate-spin")} />
          Muat ulang
        </Button>
      </div>

      {successMessage ? (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <RotateCcw className="mt-0.5 h-4 w-4 shrink-0" />
          {successMessage}
        </div>
      ) : null}

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="sales-start" className={labelClass}>Dari tanggal</label>
              <input
                id="sales-start"
                type="date"
                value={filters.startDate}
                onChange={(event) => {
                  setFilters((previous) => ({ ...previous, startDate: event.target.value }));
                  setFilterError("");
                }}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="sales-end" className={labelClass}>Sampai tanggal</label>
              <input
                id="sales-end"
                type="date"
                value={filters.endDate}
                onChange={(event) => {
                  setFilters((previous) => ({ ...previous, endDate: event.target.value }));
                  setFilterError("");
                }}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="sales-payment" className={labelClass}>Metode</label>
              <select
                id="sales-payment"
                value={filters.paymentMethod}
                onChange={(event) => setFilters((previous) => ({ ...previous, paymentMethod: event.target.value }))}
                className={inputClass}
              >
                <option value="ALL">Semua metode</option>
                <option value="CASH">Tunai</option>
                <option value="TRANSFER">Transfer</option>
                <option value="QRIS">QRIS</option>
              </select>
            </div>
            <div>
              <label htmlFor="sales-status" className={labelClass}>Status</label>
              <select
                id="sales-status"
                value={filters.status}
                onChange={(event) => setFilters((previous) => ({ ...previous, status: event.target.value }))}
                className={inputClass}
              >
                <option value="ALL">Semua status</option>
                <option value="COMPLETED">Selesai</option>
                <option value="CANCELLED">Dibatalkan</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={applyFilters}>
              <Filter className="h-4 w-4" />
              Terapkan
            </Button>
            <Button variant="outline" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </div>
        {filterError ? (
          <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">{filterError}</p>
        ) : null}
      </Card>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="min-w-0 overflow-hidden">
          <div className="border-b border-slate-100 p-4 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Daftar transaksi</h2>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {loadingHistory
                ? "Memuat transaksi..."
                : `${salesHistory.length} transaksi ditampilkan${offset > 0 ? ` · mulai data ke-${offset + 1}` : ""}`}
            </p>
          </div>

          {loadingHistory ? (
            <div className="p-4">
              <SalesSkeleton />
            </div>
          ) : historyError ? (
            <div className="p-4">
              <ErrorState title="Histori gagal dimuat" message={historyError} onRetry={() => void fetchSalesHistory()} />
            </div>
          ) : salesHistory.length === 0 ? (
            <div className="p-4">
              <EmptyState
                compact
                icon={Search}
                title="Belum ada transaksi"
                description="Transaksi yang sesuai filter akan muncul di sini."
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-500">
                      <th className="px-4 py-3 font-semibold">No. transaksi</th>
                      <th className="hidden px-4 py-3 font-semibold sm:table-cell">Waktu</th>
                      <th className="hidden px-4 py-3 font-semibold lg:table-cell">Kasir</th>
                      <th className="px-4 py-3 font-semibold">Metode</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {salesHistory.map((sale) => {
                      const selected = selectedSale?.id === sale.id;
                      const cancelled = sale.status === "CANCELLED";

                      return (
                        <tr
                          key={sale.id}
                          onClick={() => setSelectedSale(sale)}
                          className={cn(
                            "cursor-pointer transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30",
                            selected && "bg-indigo-50/50 dark:bg-indigo-500/5"
                          )}
                        >
                          <td className="px-4 py-3">
                            <p className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300">
                              {sale.transaction_number}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500 sm:hidden">
                              {formatDateTime(sale.created_at)}
                            </p>
                          </td>
                          <td className="hidden px-4 py-3 text-xs text-slate-500 dark:text-slate-400 sm:table-cell">
                            {formatDateTime(sale.created_at)}
                          </td>
                          <td className="hidden px-4 py-3 text-xs text-slate-600 dark:text-slate-300 lg:table-cell">
                            {sale.cashier_name || `User #${sale.cashier_user_id}`}
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone="slate">{paymentLabels[sale.payment_method] ?? sale.payment_method}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={cancelled ? "rose" : "emerald"}>
                              {cancelled ? "Dibatalkan" : "Selesai"}
                            </Badge>
                          </td>
                          <td className={cn(
                            "px-4 py-3 text-right font-bold",
                            cancelled
                              ? "text-slate-400 line-through dark:text-slate-500"
                              : "text-slate-900 dark:text-white"
                          )}>
                            {formatRupiah(sale.total_amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Sebelumnya
                </Button>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Halaman {Math.floor(offset / PAGE_SIZE) + 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={salesHistory.length < PAGE_SIZE}
                  onClick={() => setOffset((value) => value + PAGE_SIZE)}
                >
                  Berikutnya
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}
        </Card>

        <Card className="min-w-0 lg:sticky lg:top-24">
          <div className="border-b border-slate-100 p-4 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Detail struk</h2>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Pilih transaksi untuk melihat rincian.
            </p>
          </div>

          {selectedSale ? (
            <div className="p-4">
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs dark:border-slate-700 dark:bg-slate-950/40">
                <div className="border-b border-slate-200 pb-3 text-center dark:border-slate-700">
                  <p className="text-sm font-black tracking-wider text-slate-900 dark:text-white">SMARTPOS</p>
                  <p className="mt-1 font-mono text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                    {selectedSale.transaction_number}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                    {formatDateTime(selectedSale.created_at)}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Badge tone={selectedSale.status === "CANCELLED" ? "rose" : "emerald"}>
                    {selectedSale.status === "CANCELLED" ? "Dibatalkan" : "Selesai"}
                  </Badge>
                  <Badge tone="slate">
                    {paymentLabels[selectedSale.payment_method] ?? selectedSale.payment_method}
                  </Badge>
                  <Badge tone="slate">
                    <User className="h-3 w-3" />
                    {selectedSale.cashier_name || `User #${selectedSale.cashier_user_id}`}
                  </Badge>
                </div>

                <div className="mt-3 max-h-56 space-y-2 overflow-y-auto border-y border-slate-200 py-3 dark:border-slate-700">
                  {selectedSale.items?.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                          {item.product_name}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {item.quantity}x @ {formatRupiah(item.unit_selling_price)}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Diskon</span>
                    <span>{formatRupiah(selectedSale.discount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white">
                    <span>Total</span>
                    <span className="text-indigo-700 dark:text-indigo-300">{formatRupiah(selectedSale.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Diterima</span>
                    <span>{formatRupiah(selectedSale.amount_received)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Kembalian</span>
                    <span>{formatRupiah(selectedSale.change_amount)}</span>
                  </div>
                </div>

                {selectedSale.status === "CANCELLED" ? (
                  <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-[11px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                    <p className="font-bold">Transaksi dibatalkan</p>
                    <p className="mt-0.5">{selectedSale.cancel_reason || "Tanpa alasan tercatat."}</p>
                    <p className="mt-1 text-[10px] opacity-80">{formatDateTime(selectedSale.cancelled_at)}</p>
                  </div>
                ) : null}
              </div>

              {canCancel && selectedSale.status === "COMPLETED" ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openCancelModal(selectedSale, "return")}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Retur
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => openCancelModal(selectedSale, "cancel")}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Batalkan
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="p-4">
              <EmptyState
                compact
                icon={History}
                title="Belum ada transaksi dipilih"
                description="Klik salah satu baris transaksi untuk melihat rincian struk."
              />
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={cancelTarget !== null}
        onClose={() => !cancelling && setCancelTarget(null)}
        title={cancelTarget?.mode === "return" ? "Retur transaksi" : "Batalkan transaksi"}
        description={
          cancelTarget
            ? `${cancelTarget.sale.transaction_number} · ${formatRupiah(cancelTarget.sale.total_amount)}. Stok produk akan dikembalikan otomatis.`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={cancelling}>
              Batal
            </Button>
            <Button
              type="submit"
              form="cancel-sale-form"
              variant="danger"
              loading={cancelling}
            >
              {cancelTarget?.mode === "return" ? "Proses retur" : "Batalkan transaksi"}
            </Button>
          </>
        }
        closeOnBackdrop={!cancelling}
      >
        <form id="cancel-sale-form" onSubmit={handleCancel} className="space-y-4">
          {cancelError ? <ErrorState compact title="Transaksi belum diproses" message={cancelError} /> : null}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <CalendarDays className="mb-1 h-3.5 w-3.5" />
            Pembatalan dan retur sama-sama menandai transaksi sebagai dibatalkan serta mengembalikan stok. Tindakan ini tercatat di audit log.
          </div>
          <div>
            <label htmlFor="cancel-reason" className={labelClass}>Alasan</label>
            <textarea
              id="cancel-reason"
              rows={3}
              required
              minLength={3}
              autoFocus
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Contoh: salah input / pelanggan membatalkan pesanan"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:bg-slate-950"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
