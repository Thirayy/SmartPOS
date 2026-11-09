"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, History, LockKeyhole, Unlock, Wallet } from "lucide-react";
import { fetchApi, getBusinessId } from "@/lib/api";
import { useTodayISO } from "@/lib/use-today";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { cn, formatNumber, formatRupiah } from "@/lib/utils";

interface Shift {
  id: number;
  cashier_user_id: number;
  cashier_name: string | null;
  status: string;
  opening_cash: number | string;
  expected_cash: number | string | null;
  actual_cash: number | string | null;
  difference: number | string | null;
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
  total_cash_sales: number | string;
  total_cash_refunds: number | string;
  total_transactions: number;
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Terjadi kesalahan saat memproses shift.";

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:bg-slate-950";

const labelClass =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500";

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function ShiftsSkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function ShiftsPage() {
  const businessId = getBusinessId();
  const today = useTodayISO();

  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [openModal, setOpenModal] = useState(false);
  const [openingCash, setOpeningCash] = useState("0");
  const [openNotes, setOpenNotes] = useState("");
  const [closingShift, setClosingShift] = useState<Shift | null>(null);
  const [actualCash, setActualCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadShifts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (businessId === null) {
        throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
      }
      const [active, history] = await Promise.all([
        fetchApi(`/businesses/${businessId}/shifts/active`) as Promise<Shift | null>,
        fetchApi(`/businesses/${businessId}/shifts/?limit=50`) as Promise<Shift[]>,
      ]);
      setActiveShift(active ?? null);
      setShifts(Array.isArray(history) ? history : []);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void (async () => {
      await loadShifts();
    })();
  }, [loadShifts]);

  const expectedCash = useMemo(() => {
    if (!activeShift) return 0;
    return (
      Number(activeShift.opening_cash) +
      Number(activeShift.total_cash_sales) -
      Number(activeShift.total_cash_refunds)
    );
  }, [activeShift]);

  const actualCashNumber = Number(actualCash) || 0;
  const difference = activeShift ? actualCashNumber - expectedCash : 0;

  const handleOpenShift = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionError("");
    setSuccessMessage("");
    setSaving(true);

    try {
      if (businessId === null) {
        throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
      }
      await fetchApi(`/businesses/${businessId}/shifts/open`, {
        method: "POST",
        body: JSON.stringify({
          opening_cash: Number(openingCash) || 0,
          notes: openNotes.trim() || null,
        }),
      });
      setOpenModal(false);
      setOpeningCash("0");
      setOpenNotes("");
      setSuccessMessage("Shift berhasil dibuka.");
      await loadShifts();
    } catch (openError) {
      setActionError(getErrorMessage(openError));
    } finally {
      setSaving(false);
    }
  };

  const handleCloseShift = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!closingShift) return;

    setActionError("");
    setSuccessMessage("");
    setSaving(true);

    try {
      if (businessId === null) {
        throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
      }
      await fetchApi(`/businesses/${businessId}/shifts/${closingShift.id}/close`, {
        method: "POST",
        body: JSON.stringify({
          actual_cash: actualCashNumber,
          notes: closeNotes.trim() || null,
        }),
      });
      setClosingShift(null);
      setActualCash("");
      setCloseNotes("");
      setSuccessMessage("Shift berhasil ditutup.");
      await loadShifts();
    } catch (closeError) {
      setActionError(getErrorMessage(closeError));
    } finally {
      setSaving(false);
    }
  };

  const openCloseModal = (shift: Shift) => {
    const expected =
      Number(shift.opening_cash) +
      Number(shift.total_cash_sales) -
      Number(shift.total_cash_refunds);
    setClosingShift(shift);
    setActualCash(String(expected));
    setCloseNotes("");
    setActionError("");
    setSuccessMessage("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
            Kasir
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Shift kasir
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Buka shift sebelum berjualan dan tutup shift untuk mencocokkan uang tunai.
          </p>
        </div>

        {activeShift ? (
          <Badge tone="emerald">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Shift terbuka
          </Badge>
        ) : (
          <Badge tone="slate">
            <LockKeyhole className="h-3 w-3" />
            Belum ada shift aktif
          </Badge>
        )}
      </div>

      {successMessage ? (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {successMessage}
        </div>
      ) : null}

      {error ? (
        <ErrorState title="Shift gagal dimuat" message={error} onRetry={() => void loadShifts()} />
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="min-w-0 p-5 lg:sticky lg:top-24">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
              <Clock className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {activeShift ? "Shift sedang berjalan" : "Buka shift baru"}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {activeShift ? `Dimulai ${formatDateTime(activeShift.opened_at)}` : `Hari ini ${today || ""}`}
              </p>
            </div>
          </div>

          {activeShift ? (
            <div className="mt-4 space-y-3">
              <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/30">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">Modal awal</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatRupiah(activeShift.opening_cash)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">Penjualan tunai</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                    {formatRupiah(activeShift.total_cash_sales)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">Refund tunai</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-300">
                    {formatRupiah(activeShift.total_cash_refunds)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">Transaksi</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatNumber(activeShift.total_transactions)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2 dark:border-slate-700">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Uang seharusnya</span>
                  <span className="text-sm font-extrabold text-teal-700 dark:text-teal-300">
                    {formatRupiah(expectedCash)}
                  </span>
                </div>
              </div>

              <Button className="w-full" onClick={() => openCloseModal(activeShift)}>
                <LockKeyhole className="h-4 w-4" />
                Tutup shift
              </Button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                Catat modal awal kas di laci sebelum transaksi pertama. Shift hanya bisa ditutup oleh kasir pemilik shift atau owner/manajer.
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  setOpeningCash("0");
                  setOpenNotes("");
                  setActionError("");
                  setSuccessMessage("");
                  setOpenModal(true);
                }}
              >
                <Unlock className="h-4 w-4" />
                Buka shift
              </Button>
            </div>
          )}
        </Card>

        <Card className="min-w-0 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Riwayat shift</h2>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {loading ? "Memuat riwayat..." : `${shifts.length} shift terakhir`}
              </p>
            </div>
            <Badge tone="slate">
              <History className="h-3 w-3" />
              {formatNumber(shifts.length)}
            </Badge>
          </div>

          <div className="mt-4">
            {loading ? (
              <ShiftsSkeleton />
            ) : shifts.length === 0 ? (
              <EmptyState
                compact
                icon={Wallet}
                title="Belum ada shift"
                description="Riwayat shift akan muncul setelah kasir membuka shift pertama."
              />
            ) : (
              <div className="space-y-2.5">
                {shifts.map((shift) => {
                  const diff = shift.difference === null ? null : Number(shift.difference);
                  const isOpen = shift.status === "OPEN";

                  return (
                    <div
                      key={shift.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/30"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={isOpen ? "emerald" : "slate"}>
                            {isOpen ? "Terbuka" : "Ditutup"}
                          </Badge>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            {shift.cashier_name || `Kasir #${shift.cashier_user_id}`}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            {formatDateTime(shift.opened_at)}
                          </span>
                        </div>
                        {!isOpen ? (
                          <Badge tone={diff === 0 ? "emerald" : diff !== null && diff < 0 ? "rose" : "amber"}>
                            Selisih {formatRupiah(diff ?? 0)}
                          </Badge>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => openCloseModal(shift)}>
                            Tutup
                          </Button>
                        )}
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                        <div>
                          <p className="text-slate-400 dark:text-slate-500">Modal</p>
                          <p className="font-semibold text-slate-700 dark:text-slate-200">
                            {formatRupiah(shift.opening_cash)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 dark:text-slate-500">Tunai masuk</p>
                          <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                            {formatRupiah(shift.total_cash_sales)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 dark:text-slate-500">Seharusnya</p>
                          <p className="font-semibold text-teal-700 dark:text-teal-300">
                            {formatRupiah(shift.expected_cash ?? 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 dark:text-slate-500">Aktual</p>
                          <p className="font-semibold text-slate-700 dark:text-slate-200">
                            {shift.actual_cash === null ? "—" : formatRupiah(shift.actual_cash)}
                          </p>
                        </div>
                      </div>

                      {shift.notes ? (
                        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{shift.notes}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Modal
        open={openModal}
        onClose={() => !saving && setOpenModal(false)}
        title="Buka shift"
        description="Masukkan jumlah uang tunai awal yang ada di laci kasir."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenModal(false)} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" form="open-shift-form" loading={saving}>
              Buka shift
            </Button>
          </>
        }
        closeOnBackdrop={!saving}
      >
        <form id="open-shift-form" onSubmit={handleOpenShift} className="space-y-4">
          {actionError ? <ErrorState compact title="Shift belum bisa dibuka" message={actionError} /> : null}
          <div>
            <label htmlFor="opening-cash" className={labelClass}>Modal awal (tunai)</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">Rp</span>
              <input
                id="opening-cash"
                type="number"
                min="0"
                inputMode="numeric"
                autoFocus
                value={openingCash}
                onChange={(event) => setOpeningCash(event.target.value)}
                className={cn(inputClass, "pl-9")}
              />
            </div>
          </div>
          <div>
            <label htmlFor="open-notes" className={labelClass}>Catatan (opsional)</label>
            <textarea
              id="open-notes"
              rows={3}
              value={openNotes}
              onChange={(event) => setOpenNotes(event.target.value)}
              placeholder="Contoh: shift pagi"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:bg-slate-950"
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={closingShift !== null}
        onClose={() => !saving && setClosingShift(null)}
        title="Tutup shift"
        description="Hitung uang tunai aktual di laci, lalu masukkan jumlahnya."
        footer={
          <>
            <Button variant="outline" onClick={() => setClosingShift(null)} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" form="close-shift-form" loading={saving}>
              Tutup shift
            </Button>
          </>
        }
        closeOnBackdrop={!saving}
      >
        <form id="close-shift-form" onSubmit={handleCloseShift} className="space-y-4">
          {actionError ? <ErrorState compact title="Shift belum bisa ditutup" message={actionError} /> : null}

          {closingShift ? (
            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/30">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400">Modal awal</span>
                <span className="font-semibold">{formatRupiah(closingShift.opening_cash)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400">Penjualan tunai</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  {formatRupiah(closingShift.total_cash_sales)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400">Refund tunai</span>
                <span className="font-semibold text-rose-600 dark:text-rose-300">
                  {formatRupiah(closingShift.total_cash_refunds)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2 dark:border-slate-700">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Uang seharusnya</span>
                <span className="font-extrabold text-teal-700 dark:text-teal-300">
                  {formatRupiah(
                    Number(closingShift.opening_cash) +
                      Number(closingShift.total_cash_sales) -
                      Number(closingShift.total_cash_refunds)
                  )}
                </span>
              </div>
            </div>
          ) : null}

          <div>
            <label htmlFor="actual-cash" className={labelClass}>Uang tunai aktual</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">Rp</span>
              <input
                id="actual-cash"
                type="number"
                min="0"
                inputMode="numeric"
                autoFocus
                value={actualCash}
                onChange={(event) => setActualCash(event.target.value)}
                className={cn(inputClass, "pl-9")}
              />
            </div>
          </div>

          <div
            className={cn(
              "flex items-center justify-between rounded-xl border p-3 text-sm",
              difference === 0
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                : "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"
            )}
          >
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {difference === 0 ? "Pas" : difference > 0 ? "Surplus" : "Kurang"}
            </span>
            <span
              className={cn(
                "font-extrabold",
                difference === 0
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-amber-700 dark:text-amber-300"
              )}
            >
              {formatRupiah(Math.abs(difference))}
            </span>
          </div>

          <div>
            <label htmlFor="close-notes" className={labelClass}>Catatan (opsional)</label>
            <textarea
              id="close-notes"
              rows={3}
              value={closeNotes}
              onChange={(event) => setCloseNotes(event.target.value)}
              placeholder="Contoh: selisih karena kembalian"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:bg-slate-950"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
