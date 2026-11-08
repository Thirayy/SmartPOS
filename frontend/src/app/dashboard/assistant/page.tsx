"use client";

import { useState } from "react";
import {
  Activity,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Lightbulb,
  Loader2,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { fetchApi, getBusinessId } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";

// Interface baru yang sesuai dengan skema Backend Pydantic
interface ObservationItem {
  category: string;
  fact: string;
}

interface HypothesisItem {
  issue: string;
  root_cause: string;
}

interface HcbGuidance {
  principle: string;
  reflection: string;
}

interface ActionRecommendation {
  title: string;
  action_plan: string;
  expected_impact: string;
}

interface AnalysisResult {
  health_score: number;
  summary: string;
  observations: ObservationItem[];
  hypotheses: HypothesisItem[];
  hcb_guidance?: HcbGuidance[];
  recommendations: ActionRecommendation[];
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Gagal menjalankan analisis AI.";

function AnalysisSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-3 h-12 w-full rounded-xl" />
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <Skeleton className="h-5 w-36" />
          <div className="mt-4 space-y-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </Card>
        <Card className="p-5">
          <Skeleton className="h-5 w-36" />
          <div className="mt-4 space-y-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </Card>
      </div>
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

    const formattedText = `
*SKOR KESEHATAN BISNIS*: ${result.health_score}/100
*RINGKASAN*: ${result.summary}

*OBSERVASI*:
${result.observations.map((o) => `- [${o.category}] ${o.fact}`).join("\n")}

*ISU & AKAR MASALAH*:
${result.hypotheses.map((h) => `- ${h.issue}: ${h.root_cause}`).join("\n")}

*REKOMENDASI AKSI*:
${result.recommendations.map((r) => `- ${r.title}: ${r.action_plan} (Impact: ${r.expected_impact})`).join("\n")}
    `.trim();

    try {
      await navigator.clipboard.writeText(formattedText);
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
            Dapatkan analisis performa bisnis dan panduan etika dagang (HCB) dari data Anda.
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
              observasi kuantitatif, perspektif etika dagang HCB, serta rekomendasi aksi.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {["Observasi metrik", "Perspektif HCB", "Rekomendasi aksi"].map((item) => (
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
                  "Skor kesehatan bisnis & ringkasan",
                  "Observasi data & akar masalah",
                  "Panduan etika muamalah (HCB)",
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
        <div className="space-y-6">
          {/* Executive Summary & Score */}
          <Card className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge tone="teal">Skor Kesehatan</Badge>
                  <span className="text-xs text-slate-500">Berdasarkan data keuangan agregat</span>
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {result.summary}
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-teal-50/80 p-3 px-4 dark:bg-teal-500/10">
                <Activity className="h-7 w-7 text-teal-600 dark:text-teal-400" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Health Score
                  </span>
                  <div className="text-xl font-black text-teal-700 dark:text-teal-300">
                    {result.health_score} / 100
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Observations & Hypotheses Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Observasi & Akar Masalah
                </h3>
              </div>
              <div className="space-y-3">
                {result.observations.map((obs, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <span className="font-bold text-teal-600 dark:text-teal-400 block mb-0.5">
                      [{obs.category}]
                    </span>
                    <p className="text-slate-700 dark:text-slate-300">{obs.fact}</p>
                  </div>
                ))}
                {result.hypotheses.map((hyp, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-amber-200/50 bg-amber-50/50 p-3 text-xs dark:border-amber-900/40 dark:bg-amber-950/20"
                  >
                    <span className="font-bold text-amber-800 dark:text-amber-400 block mb-0.5">
                      Isu: {hyp.issue}
                    </span>
                    <p className="text-amber-900 dark:text-amber-300">
                      Akar Penyebab: {hyp.root_cause}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {/* HCB Guidance */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Perspektif Etika Dagang (HCB)
                </h3>
              </div>
              <div className="space-y-3">
                {result.hcb_guidance?.map((hcb, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-teal-100 bg-teal-50/40 p-3 text-xs dark:border-teal-900/30 dark:bg-teal-950/20"
                  >
                    <span className="font-bold text-teal-700 dark:text-teal-300 block mb-1">
                      Prinsip: {hcb.principle}
                    </span>
                    <p className="text-slate-600 italic dark:text-slate-400">&ldquo;{hcb.reflection}&rdquo;</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Action Recommendations */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Rekomendasi Aksi Prioritas
                </h3>
              </div>
              <Button variant="outline" size="sm" onClick={() => void copyInsights()}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Tersalin" : "Salin hasil"}
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {result.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-2 dark:border-slate-800 dark:bg-slate-900"
                >
                  <h4 className="font-bold text-xs text-teal-700 dark:text-teal-400">
                    {rec.title}
                  </h4>
                  <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                    {rec.action_plan}
                  </p>
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] dark:border-slate-800">
                    <span className="text-slate-400">Ekspektasi Dampak:</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {rec.expected_impact}
                    </span>
                  </div>
                </div>
              ))}
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
            Klik tombol mulai analisis untuk melihat ringkasan, analisis etika HCB, dan rekomendasi
            AI untuk usaha Anda.
          </p>
        </Card>
      ) : null}
    </div>
  );
}