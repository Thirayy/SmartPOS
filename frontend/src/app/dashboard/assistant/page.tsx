"use client";

import { useState } from "react";
import { fetchApi } from "@/lib/api";
import { Bot, Sparkles, Loader2 } from "lucide-react";

export default function AssistantPage() {
  const businessId = 1;
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ metrics_summary: string; insights: string } | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const res = await fetchApi(`/businesses/${businessId}/ai/analyze`, {
        method: "POST",
      });
      setResult(res);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Asisten AI Business Analyst</h1>
        <p className="text-sm text-gray-500">Dapatkan wawasan bisnis terstruktur (Observasi, Hipotesis, Rekomendasi) berdasarkan metrik riil backend[cite: 1].</p>
      </div>

      <div className="glass-card flex flex-col items-center justify-center py-10 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#28665A]/10 text-[#28665A] flex items-center justify-center">
          <Bot className="w-8 h-8" />
        </div>
        <div className="max-w-md">
          <h3 className="text-lg font-bold text-gray-800">Analisis Performa UMKM Anda</h3>
          <p className="text-xs text-gray-500 mt-1">
            AI akan mengevaluasi omzet, margin kotor, dan beban operasional Anda secara instan dan objektif.
          </p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="bg-[#28665A] text-white font-medium px-6 py-3 rounded-xl hover:bg-[#205248] transition shadow-sm flex items-center gap-2 text-sm cursor-pointer disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? "Menganalisis Data..." : "Mulai Analisis AI Sekarang"}
        </button>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="glass-card">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ringkasan Metrik Teragregasi</h4>
            <p className="text-sm font-medium text-gray-800 bg-white/60 p-3 rounded-xl border border-gray-200">
              {result.metrics_summary}
            </p>
          </div>

          <div className="glass-card space-y-3">
            <h4 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D98652]" /> Hasil Analisis & Rekomendasi
            </h4>
            <div className="prose text-sm text-gray-700 whitespace-pre-line bg-white/60 p-5 rounded-xl border border-gray-200">
              {result.insights}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}