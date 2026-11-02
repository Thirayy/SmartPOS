"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";

interface Product {
  id: number;
  name: string;
  selling_price: number;
  stock: number;
}

interface CartItem extends Product {
  quantity: number;
}

export default function POSPage() {
  const businessId = 1; // ID UMKM default untuk MVP
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [discount, setDiscount] = useState<string>("0");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await fetchApi(`/businesses/${businessId}/products`);
      setProducts(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            if (newQty > item.stock) return item;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.selling_price * item.quantity, 0);
  const totalDiscount = parseFloat(discount) || 0;
  const finalTotal = Math.max(0, subtotal - totalDiscount);
  const receivedNum = parseFloat(amountReceived) || 0;
  const changeAmount = Math.max(0, receivedNum - finalTotal);

  const handleCheckout = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    if (cart.length === 0) {
      setErrorMsg("Keranjang masih kosong");
      return;
    }
    if (receivedNum < finalTotal) {
      setErrorMsg("Uang yang diterima kurang dari total belanja");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        cashier_user_id: 1, // ID kasir default
        payment_method: paymentMethod,
        amount_received: receivedNum,
        discount: totalDiscount,
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
      };

      const res = await fetchApi(`/businesses/${businessId}/sales/checkout`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccessMsg(`Transaksi Berhasil! No: ${res.transaction_number}`);
      setCart([]);
      setAmountReceived("");
      setDiscount("0");
      loadProducts(); // Refresh stok produk
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Daftar Produk */}
      <div className="lg:col-span-2 space-y-6">
        <div className="glass-card">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#28665A]" /> Katalog Produk
          </h2>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-[#28665A] text-sm rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {successMsg}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {products.map((prod) => (
              <button
                key={prod.id}
                onClick={() => addToCart(prod)}
                disabled={prod.stock <= 0}
                className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                  prod.stock > 0
                    ? "bg-white/80 border-gray-200 hover:border-[#28665A] hover:shadow-md cursor-pointer active:scale-[0.98]"
                    : "bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed"
                }`}
              >
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm line-clamp-2">{prod.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">Stok: {prod.stock}</p>
                </div>
                <div className="mt-4 font-bold text-[#28665A] text-sm">
                  Rp{Number(prod.selling_price).toLocaleString("id-ID")}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Keranjang & Pembayaran (POS Checkout) */}
      <div className="space-y-6">
        <div className="glass-card flex flex-col h-[calc(100vh-140px)] sticky top-24">
          <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
            Keranjang Belanja
          </h2>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {cart.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-12">Belum ada item dipilih</p>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="bg-white/80 p-3 rounded-xl border border-gray-200 flex items-center justify-between">
                  <div className="flex-1 pr-2">
                    <h4 className="font-medium text-gray-800 text-sm">{item.name}</h4>
                    <p className="text-xs text-[#28665A] font-semibold">
                      Rp{(item.selling_price * item.quantity).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-semibold w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-gray-200 pt-4 mt-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>Rp{subtotal.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between text-gray-600 items-center">
              <span>Diskon (Rp)</span>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-28 px-2 py-1 bg-white border border-gray-200 rounded-lg text-right text-sm focus:outline-none focus:border-[#28665A]"
              />
            </div>
            <div className="flex justify-between text-base font-bold text-gray-800 pt-2 border-t border-gray-200">
              <span>Total Akhir</span>
              <span className="text-[#28665A]">Rp{finalTotal.toLocaleString("id-ID")}</span>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Metode Pembayaran</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28665A]"
              >
                <option value="CASH">Tunai (CASH)</option>
                <option value="TRANSFER">Transfer Bank</option>
              </select>
            </div>

            {paymentMethod === "CASH" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Uang Diterima</label>
                <input
                  type="number"
                  placeholder="0"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28665A]"
                />
                <div className="flex justify-between text-xs font-medium text-gray-500 mt-1">
                  <span>Kembalian:</span>
                  <span className="font-bold text-gray-700">Rp{changeAmount.toLocaleString("id-ID")}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={loading || cart.length === 0}
              className="w-full mt-3 bg-[#28665A] text-white font-medium py-2.5 rounded-xl hover:bg-[#205248] transition shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Memproses..." : "Bayar & Cetak Transaksi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}