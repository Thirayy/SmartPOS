"use client";

import { useState } from "react";
import { Bot, Check, Copy, Loader2, Sparkles, Wand2 } from "lucide-react";
import { fetchApi, getBusinessId } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { cn } from "@/lib/utils";

interface AnalysisResult {
  metrics_summary: string;
  insights: string;
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Gagal menjalankan analisis AI.";

function AnalysisSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="mt-3 h-16 w-full rounded-xl" />
      </Card>
      <Card className="p-5">
        <Skeleton className="h-5 w-48" />
        <div className="mt-4 space-y-2.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-10/12" />
        </div>
      </Card>
    </div>
  );
}

export default function AssistantPage() {
  const businessId = getBusinessId();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setError("");
    setCopied(false);

    try {
      if (businessId === null) {
        throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
      }
      const res = await fetchApi(`/businesses/${businessId}/ai/analyze`, {
        method: "POST",
      });
      setResult(res);
    } catch (analyzeError) {
      setError(getErrorMessage(analyzeError));
    } finally {
      setLoading(false);
    }
  };

  const copyInsights = async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result.insights);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
            Insight
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Asisten AI
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Dapatkan analisis dan rekomendasi bisnis dari data penjualan Anda.
          </p>
        </div>

        <Badge tone="teal" className="w-fit">
          <Sparkles className="h-3 w-3" />
          Business analyst
        </Badge>
      </div>

      <Card className="overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="p-6 sm:p-8">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
              <Bot className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Kenali kesehatan usaha Anda
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
              AI akan membaca omzet, laba kotor, dan beban operasional Anda, lalu memberi
              observasi serta rekomendasi yang bisa langsung dijalankan.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {["Observasi metrik", "Deteksi masalah", "Rekomendasi aksi"].map((item) => (
                <Badge key={item} tone="slate">
                  <Check className="h-3 w-3" />
                  {item}
                </Badge>
              ))}
            </div>

            <Button onClick={handleAnalyze} loading={loading} className="mt-6">
              {loading ? (
                "Menganalisis data..."
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Mulai analisis sekarang
                </>
              )}
            </Button>
            <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
              Analisis menggunakan data transaksi terbaru yang tercatat di sistem.
            </p>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-600 to-emerald-700 p-6 text-white sm:p-8">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" />
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-100">
                Yang akan Anda dapatkan
              </p>
              <ul className="mt-4 space-y-3 text-sm">
                {[
                  "Ringkasan performa keuangan",
                  "Temuan yang perlu diperhatikan",
                  "Langkah perbaikan prioritas",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-teal-50">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-inset ring-white/20">
                      <Check className="h-3 w-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-6 rounded-xl bg-white/10 p-3 text-[11px] leading-5 text-teal-50/90 ring-1 ring-inset ring-white/15">
                Hasil bersifat saran. Keputusan akhir tetap berada di tangan pemilik usaha.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {error ? (
        <ErrorState
          title="Analisis gagal dijalankan"
          message={error}
          onRetry={() => void handleAnalyze()}
        />
      ) : null}

      {loading ? <AnalysisSkeleton /> : null}

      {!loading && !error && result ? (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Ringkasan metrik
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Data yang dibaca oleh asisten AI
                </p>
              </div>
            </div>
            <p className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-200">
              {result.metrics_summary}
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                  <Bot className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Hasil analisis & rekomendasi
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Observasi, hipotesis, dan langkah lanjutan
                  </p>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={() => void copyInsights()}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Tersalin" : "Salin hasil"}
              </Button>
            </div>

            <div
              className={cn(
                "mt-4 whitespace-pre-line rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-sm leading-7 text-slate-700 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-200"
              )}
            >
              {result.insights}
            </div>
          </Card>
        </div>
      ) : null}

      {!loading && !error && !result ? (
        <Card className="flex flex-col items-center justify-center px-6 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <Loader2 className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            Belum ada analisis
          </p>
          <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">
            Klik tombol mulai analisis untuk melihat ringkasan dan rekomendasi AI untuk usaha
            Anda.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
