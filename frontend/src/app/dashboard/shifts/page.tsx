"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  History,
  Info,
  LockKeyhole,
  ReceiptText,
  Unlock,
  Wallet,
} from "lucide-react";
import { fetchApi, getBusinessId } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
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
  "h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:bg-slate-950";

const textareaClass =
  "w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:bg-slate-950";

const labelClass =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500";

function getExpectedCash(shift: Shift | null) {
  if (!shift) return 0;
  return (
    Number(shift.opening_cash) +
    Number(shift.total_cash_sales) -
    Number(shift.total_cash_refunds)
  );
}

function differenceLabel(value: number) {
  if (value === 0) return "Pas";
  return value > 0 ? "Lebih" : "Kurang";
}

function differenceTone(value: number) {
  if (value === 0) return "emerald" as const;
  return value > 0 ? "amber" as const : "rose" as const;
}

function ShiftsSkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((__, cell) => (
              <Skeleton key={cell} className="h-10 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ShiftsPage() {
  const businessId = getBusinessId();

  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [openModal, setOpenModal] = useState(false);
  const [openingCash, setOpeningCash] = useState("");
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

  const historyShifts = useMemo(
    () => shifts.filter((shift) => shift.id !== activeShift?.id),
    [activeShift?.id, shifts]
  );

  const expectedCash = getExpectedCash(activeShift);
  const closingExpectedCash = getExpectedCash(closingShift);
  const hasActualCash = actualCash.trim() !== "";
  const actualCashNumber = hasActualCash ? Number(actualCash) : 0;
  const closeDifference =
    closingShift && hasActualCash ? actualCashNumber - closingExpectedCash : null;

  const openOpenModal = () => {
    setOpeningCash("");
    setOpenNotes("");
    setActionError("");
    setSuccessMessage("");
    setOpenModal(true);
  };

  const openCloseModal = (shift: Shift) => {
    setClosingShift(shift);
    setActualCash("");
    setCloseNotes("");
    setActionError("");
    setSuccessMessage("");
  };

  const handleOpenShift = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionError("");
    setSuccessMessage("");

    const opening = openingCash.trim() === "" ? 0 : Number(openingCash);
    if (!Number.isFinite(opening) || opening < 0) {
      setActionError("Uang modal harus berupa angka 0 atau lebih.");
      return;
    }

    setSaving(true);

    try {
      if (businessId === null) {
        throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
      }
      await fetchApi(`/businesses/${businessId}/shifts/open`, {
        method: "POST",
        body: JSON.stringify({
          opening_cash: opening,
          notes: openNotes.trim() || null,
        }),
      });
      setOpenModal(false);
      setSuccessMessage("Shift berhasil dibuka. Selamat berjualan!");
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

    if (!hasActualCash) {
      setActionError("Masukkan dulu jumlah uang tunai yang kamu hitung di laci.");
      return;
    }

    if (!Number.isFinite(actualCashNumber) || actualCashNumber < 0) {
      setActionError("Uang tunai harus berupa angka 0 atau lebih.");
      return;
    }

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
      setSuccessMessage("Shift ditutup dan hitungan kas sudah disimpan.");
      await loadShifts();
    } catch (closeError) {
      setActionError(getErrorMessage(closeError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
            Kasir
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Shift kasir
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Buka shift sebelum berjualan, lalu tutup shift untuk mencocokkan uang
            tunai di laci dengan catatan penjualan.
          </p>
        </div>

        {activeShift ? (
          <Badge tone="emerald" className="self-start sm:self-auto">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Shift sedang berjalan
          </Badge>
        ) : (
          <Badge tone="slate" className="self-start sm:self-auto">
            <LockKeyhole className="h-3 w-3" />
            Belum mulai shift
          </Badge>
        )}
      </div>

      {successMessage ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {successMessage}
        </div>
      ) : null}

      {error ? (
        <ErrorState
          title="Shift gagal dimuat"
          message={error}
          onRetry={() => void loadShifts()}
        />
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-w-0 overflow-hidden">
          <div
            className={cn(
              "h-1.5 w-full",
              activeShift ? "bg-emerald-500" : "bg-teal-500"
            )}
          />
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                  activeShift
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
                )}
              >
                <Clock className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
                  {activeShift ? "Shift kamu sedang berjalan" : "Mulai shift dulu, yuk"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {activeShift
                    ? `Dimulai ${formatDateTime(activeShift.opened_at)}. Uang di laci akan dicek saat shift ditutup.`
                    : "Masukkan uang tunai yang sudah ada di laci sebelum transaksi pertama. Tidak perlu menghitung uang di luar laci."}
                </p>
              </div>
            </div>

            {activeShift ? (
              <>
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Uang yang seharusnya ada di laci
                  </p>
                  <p className="mt-1 text-2xl font-extrabold tracking-tight text-teal-700 tabular-nums dark:text-teal-300 sm:text-3xl">
                    {formatRupiah(expectedCash)}
                  </p>

                  <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Kas awal</span>
                      <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                        {formatRupiah(activeShift.opening_cash)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400">
                        Penjualan tunai
                      </span>
                      <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                        + {formatRupiah(activeShift.total_cash_sales)}
                      </span>
                    </div>
                    {Number(activeShift.total_cash_refunds) > 0 ? (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500 dark:text-slate-400">
                          Refund tunai
                        </span>
                        <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-300">
                          − {formatRupiah(activeShift.total_cash_refunds)}
                        </span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2 dark:border-slate-800">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        Total transaksi tunai
                      </span>
                      <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                        {formatNumber(activeShift.total_transactions)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Button
                    size="lg"
                    className="w-full sm:flex-1"
                    onClick={() => openCloseModal(activeShift)}
                  >
                    <LockKeyhole className="h-4 w-4" />
                    Hitung & tutup shift
                  </Button>
                  <Link
                    href="/dashboard/pos"
                    className={buttonStyles({
                      variant: "outline",
                      size: "lg",
                      className: "w-full sm:w-auto",
                    })}
                  >
                    <ReceiptText className="h-4 w-4" />
                    Buka kasir
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Contoh: laci berisi Rp100.000 sebelum jualan, isi{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      Rp100.000
                    </span>
                    . Kalau laci kosong, isi 0.
                  </p>
                </div>
                <Button size="lg" className="mt-5 w-full" onClick={openOpenModal}>
                  <Unlock className="h-4 w-4" />
                  Mulai shift
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </Card>

        <Card className="min-w-0 p-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Info className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Cara kerja singkat
            </h2>
          </div>
          <ol className="mt-4 space-y-4">
            {[
              {
                title: "Buka shift",
                description: "Catat uang tunai yang ada di laci sebelum jualan.",
              },
              {
                title: "Jualan seperti biasa",
                description: "Semua transaksi tunai otomatis masuk hitungan shift.",
              },
              {
                title: "Tutup & hitung",
                description: "Hitung uang di laci, lalu bandingkan dengan catatan.",
              },
            ].map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[11px] font-extrabold text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                  {index + 1}
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-5 text-slate-400 dark:border-slate-800 dark:text-slate-500">
            Shift hanya menghitung uang tunai. Pembayaran transfer tidak masuk
            hitungan laci.
          </p>
        </Card>
      </div>

      <Card className="min-w-0 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Riwayat shift
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {loading
                ? "Memuat riwayat..."
                : `${formatNumber(historyShifts.length)} shift selesai`}
            </p>
          </div>
          <Badge tone="slate">
            <History className="h-3 w-3" />
            {formatNumber(historyShifts.length)}
          </Badge>
        </div>

        <div className="mt-4">
          {loading ? (
            <ShiftsSkeleton />
          ) : historyShifts.length === 0 ? (
            <EmptyState
              compact
              icon={Wallet}
              title="Belum ada riwayat shift"
              description={
                activeShift
                  ? "Shift yang sedang berjalan akan muncul di sini setelah ditutup."
                  : "Riwayat muncul setelah kamu menutup shift pertama."
              }
            />
          ) : (
            <div className="space-y-2.5">
              {historyShifts.map((shift) => {
                const isOpen = shift.status === "OPEN";
                const expected = getExpectedCash(shift);
                const diff =
                  shift.difference === null ? null : Number(shift.difference);

                return (
                  <div
                    key={shift.id}
                    className={cn(
                      "rounded-2xl border p-4",
                      isOpen
                        ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-500/5"
                        : "border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30"
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            {shift.cashier_name || `Kasir #${shift.cashier_user_id}`}
                          </span>
                          <Badge tone={isOpen ? "emerald" : "slate"}>
                            {isOpen ? "Masih berjalan" : "Selesai"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                          {formatDateTime(shift.opened_at)}
                          {shift.closed_at ? ` — ${formatDateTime(shift.closed_at)}` : ""}
                        </p>
                      </div>

                      {isOpen ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openCloseModal(shift)}
                        >
                          <LockKeyhole className="h-3.5 w-3.5" />
                          Tutup shift
                        </Button>
                      ) : (
                        <Badge tone={differenceTone(diff ?? 0)}>
                          {diff === null
                            ? "Tanpa hitungan"
                            : `${differenceLabel(diff)} ${formatRupiah(Math.abs(diff))}`}
                        </Badge>
                      )}
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] sm:grid-cols-4">
                      <div>
                        <dt className="text-slate-400 dark:text-slate-500">Kas awal</dt>
                        <dd className="mt-0.5 font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                          {formatRupiah(shift.opening_cash)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-400 dark:text-slate-500">
                          Tunai masuk
                        </dt>
                        <dd className="mt-0.5 font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                          {formatRupiah(shift.total_cash_sales)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-400 dark:text-slate-500">
                          Seharusnya
                        </dt>
                        <dd className="mt-0.5 font-semibold tabular-nums text-teal-700 dark:text-teal-300">
                          {formatRupiah(shift.expected_cash ?? expected)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-400 dark:text-slate-500">
                          Uang dihitung
                        </dt>
                        <dd className="mt-0.5 font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                          {shift.actual_cash === null
                            ? "—"
                            : formatRupiah(shift.actual_cash)}
                        </dd>
                      </div>
                    </dl>

                    {shift.notes ? (
                      <p className="mt-3 rounded-lg bg-white/70 px-2.5 py-2 text-[11px] leading-5 text-slate-500 ring-1 ring-slate-100 dark:bg-slate-900/60 dark:text-slate-400 dark:ring-slate-800">
                        {shift.notes}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={openModal}
        onClose={() => !saving && setOpenModal(false)}
        title="Mulai shift"
        description="Catat uang tunai yang ada di laci sebelum transaksi pertama."
        footer={
          <>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setOpenModal(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button type="submit" form="open-shift-form" size="lg" loading={saving}>
              Mulai shift
            </Button>
          </>
        }
        closeOnBackdrop={!saving}
      >
        <form id="open-shift-form" onSubmit={handleOpenShift} className="space-y-4">
          {actionError ? (
            <ErrorState
              compact
              title="Shift belum bisa dibuka"
              message={actionError}
            />
          ) : null}

          <div>
            <label htmlFor="opening-cash" className={labelClass}>
              Uang modal di laci
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                Rp
              </span>
              <input
                id="opening-cash"
                type="number"
                min="0"
                step="1000"
                inputMode="numeric"
                autoFocus
                value={openingCash}
                onChange={(event) => setOpeningCash(event.target.value)}
                placeholder="0"
                className={cn(inputClass, "pl-9 text-base font-semibold")}
              />
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-slate-400 dark:text-slate-500">
              Uang tunai yang sudah ada di laci. Kalau kosong, biarkan 0.
            </p>
          </div>

          <div>
            <label htmlFor="open-notes" className={labelClass}>
              Catatan (opsional)
            </label>
            <textarea
              id="open-notes"
              rows={3}
              value={openNotes}
              onChange={(event) => setOpenNotes(event.target.value)}
              placeholder="Contoh: shift pagi"
              className={textareaClass}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={closingShift !== null}
        onClose={() => !saving && setClosingShift(null)}
        title="Tutup shift"
        description={
          closingShift && closingShift.status === "OPEN"
            ? "Hitung semua uang tunai di laci sekarang, lalu masukkan jumlahnya."
            : undefined
        }
        footer={
          <>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setClosingShift(null)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button type="submit" form="close-shift-form" size="lg" loading={saving}>
              <LockKeyhole className="h-4 w-4" />
              Tutup shift
            </Button>
          </>
        }
        closeOnBackdrop={!saving}
      >
        <form id="close-shift-form" onSubmit={handleCloseShift} className="space-y-4">
          {actionError ? (
            <ErrorState
              compact
              title="Shift belum bisa ditutup"
              message={actionError}
            />
          ) : null}

          {closingShift ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs dark:border-slate-800 dark:bg-slate-950/30">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-slate-800 dark:text-slate-100">
                  {closingShift.cashier_name || `Kasir #${closingShift.cashier_user_id}`}
                </p>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {formatDateTime(closingShift.opened_at)}
                </span>
              </div>

              <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">Kas awal</span>
                  <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                    {formatRupiah(closingShift.opening_cash)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">
                    Penjualan tunai
                  </span>
                  <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                    + {formatRupiah(closingShift.total_cash_sales)}
                  </span>
                </div>
                {Number(closingShift.total_cash_refunds) > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">
                      Refund tunai
                    </span>
                    <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-300">
                      − {formatRupiah(closingShift.total_cash_refunds)}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2 dark:border-slate-800">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    Uang seharusnya
                  </span>
                  <span className="text-sm font-extrabold tabular-nums text-teal-700 dark:text-teal-300">
                    {formatRupiah(closingExpectedCash)}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <div>
            <label htmlFor="actual-cash" className={labelClass}>
              Uang tunai di laci sekarang
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                Rp
              </span>
              <input
                id="actual-cash"
                type="number"
                min="0"
                step="1000"
                inputMode="numeric"
                autoFocus
                value={actualCash}
                onChange={(event) => setActualCash(event.target.value)}
                placeholder="Masukkan hasil hitung"
                className={cn(inputClass, "pl-9 text-base font-semibold")}
              />
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-slate-400 dark:text-slate-500">
              Masukkan hasil hitung fisik, bukan angka “uang seharusnya”.
            </p>
          </div>

          {closeDifference !== null ? (
            <div
              role="status"
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border p-3 text-sm",
                closeDifference === 0
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                  : "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"
              )}
            >
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {closeDifference === 0
                  ? "Uang sudah sesuai catatan"
                  : `Uang ${differenceLabel(closeDifference).toLowerCase()} dari catatan`}
              </span>
              <span
                className={cn(
                  "shrink-0 font-extrabold tabular-nums",
                  closeDifference === 0
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-amber-700 dark:text-amber-300"
                )}
              >
                {formatRupiah(Math.abs(closeDifference))}
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              Selisih akan muncul otomatis setelah kamu mengisi jumlah uang.
            </div>
          )}

          <div>
            <label htmlFor="close-notes" className={labelClass}>
              Catatan (opsional)
            </label>
            <textarea
              id="close-notes"
              rows={3}
              value={closeNotes}
              onChange={(event) => setCloseNotes(event.target.value)}
              placeholder="Contoh: ada selisih karena kembalian"
              className={textareaClass}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
