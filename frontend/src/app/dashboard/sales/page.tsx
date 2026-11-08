"use client";

import { useState, useEffect, useCallback } from "react";
import type { SaleResponse } from "@/types/sales";
import { fetchApi, getBusinessId } from "@/lib/api";

export default function SalesHistoryPage() {
  const businessId = getBusinessId();
  const [salesHistory, setSalesHistory] = useState<SaleResponse[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleResponse | null>(null);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [historyError, setHistoryError] = useState("");

  const fetchSalesHistory = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError("");
    setSalesHistory([]);
    setSelectedSale(null);

    try {
      if (businessId === null) {
        throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
      }

      const data = await fetchApi(`/businesses/${businessId}/sales`) as SaleResponse[];
      setSalesHistory(data);
      setSelectedSale((current) => current ?? data[0] ?? null);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Gagal memuat histori transaksi.");
      setSalesHistory([]);
      setSelectedSale(null);
    } finally {
      setLoadingHistory(false);
    }
  }, [businessId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        if (businessId === null) {
          throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
        }

        const data = await fetchApi(
          `/businesses/${businessId}/sales`
        ) as SaleResponse[];
        if (cancelled) return;

        setSalesHistory(data);
        setSelectedSale(data[0] ?? null);
      } catch (error) {
        if (cancelled) return;
        setHistoryError(
          error instanceof Error ? error.message : "Gagal memuat histori transaksi."
        );
        setSalesHistory([]);
        setSelectedSale(null);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-blue-400">Histori Transaksi Penjualan</h1>
          <p className="text-sm text-gray-400">Pantau seluruh riwayat transaksi dan rincian struk toko</p>
        </div>
        <button
          onClick={fetchSalesHistory}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm font-medium rounded-lg transition border border-gray-700"
        >
          🔄 Refresh Data
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabel Daftar Histori (2 Kolom) */}
        <div className="lg:col-span-2 bg-gray-800/50 border border-gray-700/50 p-4 rounded-xl">
          <h2 className="text-lg font-semibold mb-4 text-gray-200">Daftar Transaksi Masuk</h2>
          
          {loadingHistory ? (
            <div className="text-center py-12 text-gray-400">Memuat histori transaksi...</div>
          ) : historyError ? (
            <div className="text-center py-12 text-rose-400">{historyError}</div>
          ) : salesHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Belum ada riwayat transaksi tercatat.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="p-3">No. Transaksi</th>
                    <th className="p-3">Waktu</th>
                    <th className="p-3">Metode</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {salesHistory.map((sale) => (
                    <tr 
                      key={sale.id} 
                      className={`hover:bg-gray-800/60 transition cursor-pointer ${
                        selectedSale?.id === sale.id ? "bg-gray-800/80 border-l-4 border-blue-500" : ""
                      }`}
                      onClick={() => setSelectedSale(sale)}
                    >
                      <td className="p-3 font-mono text-blue-400 font-medium">
                        {sale.transaction_number}
                      </td>
                      <td className="p-3 text-xs text-gray-400">
                        {new Date(sale.created_at).toLocaleString("id-ID")}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-gray-700 text-xs rounded font-medium">
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold text-emerald-400">
                        Rp {Number(sale.total_amount).toLocaleString("id-ID")}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSale(sale);
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-xs rounded transition font-medium"
                        >
                          Lihat Struk
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Panel Detail Struk / Nota (1 Kolom) */}
        <div className="bg-gray-800/50 border border-gray-700/50 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-4 text-gray-200 border-b border-gray-700 pb-2">
              Detail Struk Nota
            </h2>

            {selectedSale ? (
              <div className="bg-gray-900 border border-gray-700 p-4 rounded-lg font-mono text-xs space-y-4">
                <div className="text-center border-b border-gray-800 pb-3">
                  <p className="font-bold text-sm tracking-wider text-blue-400">SMARTPOS STORE</p>
                  <p className="text-gray-300 font-semibold mt-1">{selectedSale.transaction_number}</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    {new Date(selectedSale.created_at).toLocaleString("id-ID")}
                  </p>
                </div>

                <div className="space-y-2.5 border-b border-gray-800 pb-3 max-h-48 overflow-y-auto pr-1">
                  <p className="text-[11px] text-gray-400 uppercase font-sans font-semibold">Rincian Item:</p>
                  {selectedSale.items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-start">
                      <div>
                        <p className="font-sans font-medium text-gray-200">{item.product_name}</p>
                        <p className="text-gray-400">
                          {item.quantity}x @Rp {Number(item.unit_selling_price).toLocaleString("id-ID")}
                        </p>
                      </div>
                      <span className="font-semibold text-gray-200">
                        Rp {Number(item.subtotal).toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5 text-gray-300 font-sans pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Diskon:</span>
                    <span>Rp {Number(selectedSale.discount).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-white pt-1 border-t border-gray-800">
                    <span>TOTAL:</span>
                    <span className="text-blue-400">Rp {Number(selectedSale.total_amount).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Bayar ({selectedSale.payment_method}):</span>
                    <span>Rp {Number(selectedSale.amount_received).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Kembalian:</span>
                    <span>Rp {Number(selectedSale.change_amount).toLocaleString("id-ID")}</span>
                  </div>
                </div>

                <div className="text-center pt-3 text-gray-500 text-[10px] border-t border-gray-800">
                  Terima kasih atas kunjungan Anda!<br/>Simpan struk ini sebagai bukti pembayaran.
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-gray-500 text-sm">
                Klik salah satu baris transaksi di sebelah kiri untuk melihat rincian struk nota.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}