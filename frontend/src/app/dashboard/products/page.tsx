"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { Plus, AlertTriangle } from "lucide-react";

interface Product {
  id: number;
  name: string;
  sku: string;
  selling_price: number;
  cost_price: number;
  stock: number;
  low_stock_threshold: number;
}

export default function ProductsPage() {
  const businessId = 1;
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stock, setStock] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await fetchApi(`/businesses/${businessId}/products`);
      setProducts(res);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi(`/businesses/${businessId}/products`, {
        method: "POST",
        body: JSON.stringify({
          name,
          sku: sku || null,
          selling_price: parseFloat(sellingPrice),
          cost_price: parseFloat(costPrice),
          stock: parseInt(stock) || 0,
        }),
      });
      setShowAddModal(false);
      setName("");
      setSku("");
      setSellingPrice("");
      setCostPrice("");
      setStock("");
      loadProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Manajemen Produk & Stok</h1>
          <p className="text-sm text-gray-500">Kelola katalog barang dan pantau ambang batas stok minimum.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#28665A] text-white font-medium px-4 py-2.5 rounded-xl hover:bg-[#205248] transition shadow-sm flex items-center gap-2 text-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Tambah Produk
        </button>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}

      {/* Modal Tambah Produk */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Tambah Produk Baru</h2>
            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nama Produk</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28665A]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">SKU (Opsional)</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28665A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Stok Awal</label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28665A]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Harga Beli (Cost)</label>
                  <input
                    type="number"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28665A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Harga Jual (Selling)</label>
                  <input
                    type="number"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28665A]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#28665A] text-white rounded-xl text-sm font-medium hover:bg-[#205248]"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabel Produk */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-medium">
                <th className="py-3 px-4">Nama Produk</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Harga Beli</th>
                <th className="py-3 px-4">Harga Jual</th>
                <th className="py-3 px-4">Stok</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((prod) => (
                <tr key={prod.id} className="hover:bg-white/50 transition">
                  <td className="py-3 px-4 font-medium text-gray-800">{prod.name}</td>
                  <td className="py-3 px-4 text-gray-500">{prod.sku || "-"}</td>
                  <td className="py-3 px-4 text-gray-600">Rp{Number(prod.cost_price).toLocaleString("id-ID")}</td>
                  <td className="py-3 px-4 text-[#28665A] font-semibold">Rp{Number(prod.selling_price).toLocaleString("id-ID")}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      prod.stock <= prod.low_stock_threshold ? "bg-amber-100 text-amber-800" : "bg-[#28665A]/10 text-[#28665A]"
                    }`}>
                      {prod.stock <= prod.low_stock_threshold && <AlertTriangle className="w-3.5 h-3.5" />}
                      {prod.stock} unit
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}