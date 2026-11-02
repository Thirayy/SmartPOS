"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";

interface Expense {
  id: number;
  category: string;
  amount: number;
  date: string;
  description: string;
}

export default function ExpensesPage() {
  const businessId = 1;
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [category, setCategory] = useState("RENT");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const res = await fetchApi(`/businesses/${businessId}/expenses`);
      setExpenses(res);
    } catch (err) {}
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi(`/businesses/${businessId}/expenses`, {
        method: "POST",
        body: JSON.stringify({
          category,
          amount: parseFloat(amount),
          date,
          description,
          user_id: 1,
        }),
      });
      setAmount("");
      setDate("");
      setDescription("");
      loadExpenses();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Pengeluaran Operasional</h1>
        <p className="text-sm text-gray-500">Catat dan pantau pengeluaran rutin bisnis untuk perhitungan laba bersih akurat.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card">
          <h3 className="text-base font-bold text-gray-800 mb-4">Catat Pengeluaran Baru</h3>
          <form onSubmit={handleCreateExpense} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28665A]"
              >
                <option value="RENT">Sewa Tempat (RENT)</option>
                <option value="UTILITIES">Utilitas (Listrik/Air/Internet)</option>
                <option value="SUPPLIES">Perlengkapan (SUPPLIES)</option>
                <option value="OTHER">Lainnya (OTHER)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Jumlah (Rp)</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28665A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28665A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi</label>
              <textarea
                required
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28665A]"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#28665A] text-white font-medium py-2.5 rounded-xl hover:bg-[#205248] transition shadow-sm text-sm cursor-pointer"
            >
              Simpan Pengeluaran
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 glass-card">
          <h3 className="text-base font-bold text-gray-800 mb-4">Riwayat Pengeluaran</h3>
          <div className="space-y-3">
            {expenses.length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada catatan pengeluaran.</p>
            ) : (
              expenses.map((exp) => (
                <div key={exp.id} className="p-3 bg-white/70 rounded-xl border border-gray-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">
                      {exp.category}
                    </span>
                    <h4 className="font-medium text-gray-800 text-sm mt-1">{exp.description}</h4>
                    <span className="text-xs text-gray-400">{exp.date}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-red-600 text-sm">Rp{Number(exp.amount).toLocaleString("id-ID")}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}