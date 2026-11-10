"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Filter, Pencil, Receipt, Trash2, Wallet } from "lucide-react";
import { fetchApi, getBusinessId } from "@/lib/api";
import { useTodayISO } from "@/lib/use-today";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { cn, formatRupiah } from "@/lib/utils";

interface Expense {
  id: number;
  category: string;
  amount: number | string;
  date: string;
  description: string;
}

const categories = [
  { value: "RENT", label: "Sewa tempat" },
  { value: "UTILITIES", label: "Listrik, air & internet" },
  { value: "SUPPLIES", label: "Perlengkapan" },
  { value: "OTHER", label: "Lainnya" },
];

const categoryStyles: Record<string, { label: string; tone: "sky" | "amber" | "teal" | "slate" }> = {
  RENT: { label: "Sewa", tone: "sky" },
  UTILITIES: { label: "Utilitas", tone: "amber" },
  SUPPLIES: { label: "Perlengkapan", tone: "teal" },
  OTHER: { label: "Lainnya", tone: "slate" },
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Terjadi kesalahan saat memuat data pengeluaran.";

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:bg-slate-950";

const labelClass =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function ExpenseListSkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

export default function ExpensesPage() {
  const businessId = getBusinessId();
  const today = useTodayISO();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");
  const [filterError, setFilterError] = useState("");

  const [category, setCategory] = useState("RENT");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [editing, setEditing] = useState<Expense | null>(null);
  const [editCategory, setEditCategory] = useState("RENT");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSaving, setDeleteSaving] = useState(false);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (businessId === null) {
        setError("Sesi login tidak ditemukan. Silakan masuk kembali.");
        return;
      }
      const params = new URLSearchParams();
      if (appliedStartDate) params.set("start_date", appliedStartDate);
      if (appliedEndDate) params.set("end_date", appliedEndDate);
      const query = params.toString();
      const res = await fetchApi(
        `/businesses/${businessId}/expenses/${query ? `?${query}` : ""}`
      );
      setExpenses(Array.isArray(res) ? res : []);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [businessId, appliedStartDate, appliedEndDate]);

  useEffect(() => {
    void (async () => {
      await loadExpenses();
    })();
  }, [loadExpenses]);

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
    [expenses]
  );

  const handleCreateExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!amount || Number(amount) <= 0) {
      setFormError("Nominal pengeluaran harus lebih dari nol.");
      return;
    }

    setSaving(true);

    try {
      if (businessId === null) {
        throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
      }
      const created = await fetchApi(`/businesses/${businessId}/expenses`, {
        method: "POST",
        body: JSON.stringify({
          category,
          amount: Number(amount),
          date: date || today,
          description: description.trim(),
        }),
      });

      setExpenses((previous) => [created, ...previous]);
      setAmount("");
      setDescription("");
      setSuccessMessage("Pengeluaran berhasil dicatat.");
    } catch (createError) {
      setFormError(getErrorMessage(createError));
    } finally {
      setSaving(false);
    }
  };

  const applyDateFilter = () => {
    if (startDateFilter && endDateFilter && startDateFilter > endDateFilter) {
      setFilterError("Tanggal mulai tidak boleh setelah tanggal akhir.");
      return;
    }
    setFilterError("");
    setAppliedStartDate(startDateFilter);
    setAppliedEndDate(endDateFilter);
  };

  const resetDateFilter = () => {
    setStartDateFilter("");
    setEndDateFilter("");
    setAppliedStartDate("");
    setAppliedEndDate("");
    setFilterError("");
  };

  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setEditCategory(expense.category);
    setEditAmount(String(expense.amount));
    setEditDate(expense.date);
    setEditDescription(expense.description);
    setEditError("");
    setSuccessMessage("");
  };

  const handleUpdateExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;

    if (!editAmount || Number(editAmount) <= 0) {
      setEditError("Nominal pengeluaran harus lebih dari nol.");
      return;
    }

    setEditSaving(true);
    setEditError("");

    try {
      if (businessId === null) {
        throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
      }
      const updated = (await fetchApi(`/businesses/${businessId}/expenses/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          category: editCategory,
          amount: Number(editAmount),
          date: editDate,
          description: editDescription.trim(),
        }),
      })) as Expense;

      setExpenses((previous) =>
        previous.map((expense) => (expense.id === updated.id ? updated : expense))
      );
      setEditing(null);
      setSuccessMessage("Pengeluaran berhasil diperbarui.");
    } catch (updateError) {
      setEditError(getErrorMessage(updateError));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deleting) return;

    setDeleteSaving(true);
    setDeleteError("");

    try {
      if (businessId === null) {
        throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
      }
      await fetchApi(`/businesses/${businessId}/expenses/${deleting.id}`, {
        method: "DELETE",
      });
      setExpenses((previous) => previous.filter((expense) => expense.id !== deleting.id));
      setDeleting(null);
      setSuccessMessage("Pengeluaran berhasil dihapus.");
    } catch (deleteFailure) {
      setDeleteError(getErrorMessage(deleteFailure));
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
            Keuangan
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Pengeluaran operasional
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Catat biaya rutin agar perhitungan laba bersih usaha tetap akurat.
          </p>
        </div>

        <Badge tone="rose" className="w-fit">
          <Wallet className="h-3 w-3" />
          Total {formatRupiah(totalExpenses)}
        </Badge>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div>
              <label htmlFor="expense-filter-start" className={labelClass}>Dari tanggal</label>
              <input
                id="expense-filter-start"
                type="date"
                value={startDateFilter}
                onChange={(event) => {
                  setStartDateFilter(event.target.value);
                  setFilterError("");
                }}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="expense-filter-end" className={labelClass}>Sampai tanggal</label>
              <input
                id="expense-filter-end"
                type="date"
                value={endDateFilter}
                onChange={(event) => {
                  setEndDateFilter(event.target.value);
                  setFilterError("");
                }}
                className={inputClass}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={applyDateFilter}>
                <Filter className="h-4 w-4" />
                Terapkan
              </Button>
              <Button type="button" variant="outline" onClick={resetDateFilter}>
                Reset
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {appliedStartDate || appliedEndDate
              ? `Filter aktif: ${appliedStartDate || "awal"} – ${appliedEndDate || "sekarang"}`
              : "Menampilkan seluruh pengeluaran."}
          </p>
        </div>
        {filterError ? (
          <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">{filterError}</p>
        ) : null}
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="min-w-0 p-5 lg:sticky lg:top-24">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
              <Wallet className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Catat pengeluaran
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tambahkan biaya baru
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateExpense} className="mt-4 space-y-3.5">
            {formError ? (
              <ErrorState compact title="Pengeluaran belum tersimpan" message={formError} />
            ) : null}

            {successMessage ? (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                {successMessage}
              </div>
            ) : null}

            <div>
              <label htmlFor="expense-category" className={labelClass}>
                Kategori
              </label>
              <select
                id="expense-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className={inputClass}
              >
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="expense-amount" className={labelClass}>
                Jumlah
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  Rp
                </span>
                <input
                  id="expense-amount"
                  type="number"
                  min="0"
                  required
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0"
                  className={cn(inputClass, "pl-9")}
                />
              </div>
            </div>

            <div>
              <label htmlFor="expense-date" className={labelClass}>
                Tanggal
              </label>
              <input
                id="expense-date"
                type="date"
                required
                value={date || today}
                onChange={(event) => setDate(event.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="expense-description" className={labelClass}>
                Deskripsi
              </label>
              <textarea
                id="expense-description"
                required
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Contoh: Bayar listrik bulan ini"
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:bg-slate-950"
              />
            </div>

            <Button type="submit" loading={saving} className="w-full">
              Simpan pengeluaran
            </Button>
          </form>
        </Card>

        <Card className="min-w-0 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Riwayat pengeluaran
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {loading ? "Memuat riwayat..." : `${expenses.length} catatan terakhir`}
              </p>
            </div>
            <Badge tone="rose" className="shrink-0">{formatRupiah(totalExpenses)}</Badge>
          </div>

          <div className="mt-4">
            {loading ? (
              <ExpenseListSkeleton />
            ) : error ? (
              <ErrorState
                title="Pengeluaran gagal dimuat"
                message={error}
                onRetry={() => void loadExpenses()}
              />
            ) : expenses.length === 0 ? (
              <EmptyState
                compact
                icon={Receipt}
                title="Belum ada pengeluaran"
                description="Catatan biaya operasional akan muncul di sini setelah ditambahkan."
              />
            ) : (
              <div className="space-y-2.5">
                {expenses.map((expense) => {
                  const meta = categoryStyles[expense.category] ?? categoryStyles.OTHER;

                  return (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition hover:border-slate-200 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:border-slate-700"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:text-slate-500 dark:ring-slate-800">
                          <Receipt className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              {formatDate(expense.date)}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {expense.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <p className="text-sm font-extrabold text-rose-600 dark:text-rose-300">
                          {formatRupiah(expense.amount)}
                        </p>
                        <button
                          type="button"
                          onClick={() => openEdit(expense)}
                          aria-label={`Ubah pengeluaran ${expense.description}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleting(expense);
                            setDeleteError("");
                          }}
                          aria-label={`Hapus pengeluaran ${expense.description}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 active:scale-95 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Modal
        open={editing !== null}
        onClose={() => !editSaving && setEditing(null)}
        title="Ubah pengeluaran"
        description="Perubahan akan tercatat di audit log."
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={editSaving}>
              Batal
            </Button>
            <Button type="submit" form="expense-edit-form" loading={editSaving}>
              Simpan perubahan
            </Button>
          </>
        }
        closeOnBackdrop={!editSaving}
      >
        <form id="expense-edit-form" onSubmit={handleUpdateExpense} className="space-y-4">
          {editError ? <ErrorState compact title="Perubahan belum tersimpan" message={editError} /> : null}

          <div>
            <label htmlFor="edit-expense-category" className={labelClass}>Kategori</label>
            <select
              id="edit-expense-category"
              value={editCategory}
              onChange={(event) => setEditCategory(event.target.value)}
              className={inputClass}
            >
              {categories.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="edit-expense-amount" className={labelClass}>Jumlah</label>
            <input
              id="edit-expense-amount"
              type="number"
              min="0"
              required
              value={editAmount}
              onChange={(event) => setEditAmount(event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="edit-expense-date" className={labelClass}>Tanggal</label>
            <input
              id="edit-expense-date"
              type="date"
              required
              value={editDate}
              onChange={(event) => setEditDate(event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="edit-expense-description" className={labelClass}>Deskripsi</label>
            <textarea
              id="edit-expense-description"
              rows={3}
              required
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:bg-slate-950"
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => !deleteSaving && setDeleting(null)}
        title="Hapus pengeluaran"
        description="Catatan pengeluaran akan dihapus permanen."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deleteSaving}>
              Batal
            </Button>
            <Button variant="danger" onClick={() => void handleDeleteExpense()} loading={deleteSaving}>
              Hapus
            </Button>
          </>
        }
        closeOnBackdrop={!deleteSaving}
      >
        {deleteError ? <ErrorState compact title="Gagal menghapus" message={deleteError} /> : null}
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Hapus pengeluaran <span className="font-bold">{deleting?.description}</span> sebesar{" "}
          <span className="font-bold">{formatRupiah(deleting?.amount ?? 0)}</span>?
        </p>
      </Modal>
    </div>
  );
}
