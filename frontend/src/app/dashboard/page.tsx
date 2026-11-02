"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { TrendingUp, ShoppingBag, DollarSign, Wallet, ArrowUpRight, Award } from "lucide-react";

interface DashboardData {
  total_omzet: number;
  total_transactions: number;
  total_cogs: number;
  estimated_gross_profit: number;
  total_expenses: number;
  estimated_operating_result: number;
  best_sellers: Array<{ product_name: string; total_sold: number }>;
}

export default function DashboardPage() {
  const businessId = 1;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await fetchApi(`/businesses/${businessId}/reports/dashboard`);
      setData(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Memuat data dashboard...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Dashboard & Laporan Keuangan</h1>
        <p className="text-sm text-gray-500">Ringkasan performa bisnis dan agregasi keuangan real-time dari backend[cite: 1].</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="glass-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#28665A]/10 text-[#28665A] flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Total Omzet</p>
            <h3 className="text-xl font-bold text-gray-800 mt-1">
              Rp{(data?.total_omzet || 0).toLocaleString("id-ID")}
            </h3>
          </div>
        </div>

        <div className="glass-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#D98652]/10 text-[#D98652] flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Total Transaksi</p>
            <h3 className="text-xl font-bold text-gray-800 mt-1">{data?.total_transactions || 0}</h3>
          </div>
        </div>

        <div className="glass-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#28665A]/10 text-[#28665A] flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Laba Kotor (Gross Profit)</p>
            <h3 className="text-xl font-bold text-[#28665A] mt-1">
              Rp{(data?.estimated_gross_profit || 0).toLocaleString("id-ID")}
            </h3>
          </div>
        </div>

        <div className="glass-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Total Pengeluaran Operasional</p>
            <h3 className="text-xl font-bold text-red-600 mt-1">
              Rp{(data?.total_expenses || 0).toLocaleString("id-ID")}
            </h3>
          </div>
        </div>

        <div className="glass-card sm:col-span-2 lg:col-span-2 flex items-center justify-between bg-gradient-to-r from-[#28665A]/5 to-[#D98652]/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#28665A] text-white flex items-center justify-center shadow-sm">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">Hasil Operasional Bersih (Net Result)</p>
              <h3 className="text-2xl font-extrabold text-[#28665A] mt-1">
                Rp{(data?.estimated_operating_result || 0).toLocaleString("id-ID")}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Best Sellers */}
      <div className="glass-card">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-[#D98652]" /> Produk Terlaris (Best Sellers)
        </h2>
        {data?.best_sellers.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada data penjualan produk.</p>
        ) : (
          <div className="space-y-3">
            {data?.best_sellers.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/60 border border-gray-200">
                <span className="font-medium text-gray-800 text-sm">{item.product_name}</span>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#28665A]/10 text-[#28665A]">
                  Terjual: {item.total_sold} unit
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}