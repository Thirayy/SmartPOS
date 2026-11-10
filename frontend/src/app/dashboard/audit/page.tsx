"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Filter, ScrollText } from "lucide-react";
import { fetchApi, getBusinessId } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: number;
  business_id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  description: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
}

const PAGE_SIZE = 50;

const entityTypes = ["ALL", "PRODUCT", "SALE", "EXPENSE", "SHIFT"];
const actions = [
  "ALL",
  "CREATE",
  "UPDATE",
  "DELETE",
  "DEACTIVATE",
  "STOCK_ADJUST",
  "CHECKOUT",
  "CANCEL",
  "RETURN",
  "SHIFT_OPEN",
  "SHIFT_CLOSE",
];

const actionTones: Record<string, "emerald" | "rose" | "amber" | "sky" | "teal" | "slate"> = {
  CREATE: "emerald",
  UPDATE: "sky",
  DELETE: "rose",
  DEACTIVATE: "rose",
  STOCK_ADJUST: "amber",
  CHECKOUT: "teal",
  CANCEL: "rose",
  RETURN: "rose",
  SHIFT_OPEN: "teal",
  SHIFT_CLOSE: "slate",
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Terjadi kesalahan saat memuat audit log.";

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:focus:border-teal-500 dark:focus:bg-slate-950";

const labelClass =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500";

const actionLabel = (action: string) =>
  action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

function AuditSkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="mt-2 h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export default function AuditPage() {
  const businessId = getBusinessId();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [entityType, setEntityType] = useState("ALL");
  const [action, setAction] = useState("ALL");
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);

  const appliedEntityType = useMemo(() => (entityType === "ALL" ? "" : entityType), [entityType]);
  const appliedAction = useMemo(() => (action === "ALL" ? "" : action), [action]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (businessId === null) {
        throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
      }
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (appliedEntityType) params.set("entity_type", appliedEntityType);
      if (appliedAction) params.set("action", appliedAction);

      const data = await fetchApi(`/businesses/${businessId}/audit/?${params.toString()}`);
      setLogs(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [businessId, appliedEntityType, appliedAction, offset]);

  useEffect(() => {
    void (async () => {
      await loadLogs();
    })();
  }, [loadLogs]);

  const resetFilters = () => {
    setEntityType("ALL");
    setAction("ALL");
    setOffset(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
            Keamanan
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Audit log
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Jejak perubahan data penting: produk, transaksi, pengeluaran, dan shift.
          </p>
        </div>
        <Badge tone="slate">
          <ScrollText className="h-3 w-3" />
          {logs.length} catatan
        </Badge>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div>
              <label htmlFor="audit-entity" className={labelClass}>Jenis data</label>
              <select
                id="audit-entity"
                value={entityType}
                onChange={(event) => {
                  setEntityType(event.target.value);
                  setOffset(0);
                  setExpanded(null);
                }}
                className={cn(inputClass, "sm:w-44")}
              >
                {entityTypes.map((value) => (
                  <option key={value} value={value}>
                    {value === "ALL" ? "Semua jenis" : value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="audit-action" className={labelClass}>Aksi</label>
              <select
                id="audit-action"
                value={action}
                onChange={(event) => {
                  setAction(event.target.value);
                  setOffset(0);
                  setExpanded(null);
                }}
                className={cn(inputClass, "sm:w-44")}
              >
                {actions.map((value) => (
                  <option key={value} value={value}>
                    {value === "ALL" ? "Semua aksi" : actionLabel(value)}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" variant="outline" onClick={resetFilters}>
              <Filter className="h-4 w-4" />
              Reset
            </Button>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Menampilkan {PAGE_SIZE} catatan per halaman, terbaru lebih dulu.
          </p>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        {loading ? (
          <AuditSkeleton />
        ) : error ? (
          <ErrorState title="Audit log gagal dimuat" message={error} onRetry={() => void loadLogs()} />
        ) : logs.length === 0 ? (
          <EmptyState
            compact
            icon={ScrollText}
            title="Belum ada catatan"
            description="Aktivitas perubahan data akan tercatat di sini secara otomatis."
          />
        ) : (
          <div className="space-y-2.5">
            {logs.map((log) => {
              const isExpanded = expanded === log.id;
              const hasDetails = Boolean(log.before_data || log.after_data);

              return (
                <div
                  key={log.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/30"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={actionTones[log.action] ?? "slate"}>{actionLabel(log.action)}</Badge>
                      <Badge tone="slate">{log.entity_type}</Badge>
                      {log.entity_id ? (
                        <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                          #{log.entity_id}
                        </span>
                      ) : null}
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {formatDateTime(log.created_at)}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {log.user_id ? `User #${log.user_id}` : "Sistem"}
                    </span>
                  </div>

                  <p className="mt-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {log.description || `${actionLabel(log.action)} ${log.entity_type.toLowerCase()}`}
                  </p>

                  {hasDetails ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setExpanded(isExpanded ? null : log.id)}
                        aria-expanded={isExpanded}
                        className="mt-1 flex min-h-8 cursor-pointer items-center gap-1 py-1 text-[11px] font-semibold text-teal-700 transition hover:text-teal-600 dark:text-teal-300 dark:hover:text-teal-200"
                      >
                        <ChevronDown className={cn("h-3.5 w-3.5 transition", isExpanded && "rotate-180")} />
                        {isExpanded ? "Sembunyikan detail" : "Lihat detail perubahan"}
                      </button>

                      {isExpanded ? (
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              Sebelum
                            </p>
                            <pre className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-[10px] leading-4 text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                              {log.before_data ? JSON.stringify(log.before_data, null, 2) : "—"}
                            </pre>
                          </div>
                          <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              Sesudah
                            </p>
                            <pre className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-[10px] leading-4 text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                              {log.after_data ? JSON.stringify(log.after_data, null, 2) : "—"}
                            </pre>
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              );
            })}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0 || loading}
                onClick={() => {
                  setOffset((value) => Math.max(0, value - PAGE_SIZE));
                  setExpanded(null);
                }}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Sebelumnya
              </Button>
              <span className="order-first w-full text-center text-[11px] text-slate-400 dark:text-slate-500 sm:order-none sm:w-auto">
                Halaman {Math.floor(offset / PAGE_SIZE) + 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={logs.length < PAGE_SIZE || loading}
                onClick={() => {
                  setOffset((value) => value + PAGE_SIZE);
                  setExpanded(null);
                }}
              >
                Berikutnya
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
