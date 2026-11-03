"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Package, Plus, Search, X } from "lucide-react";
import { fetchApi, getBusinessId } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import {
  cn,
  formatNumber,
  formatRupiah,
  getInitials,
  getProductTone,
} from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  sku: string | null;
  selling_price: number | string;
  cost_price: number | string;
  stock: number;
  low_stock_threshold: number;
}

interface ProductForm {
  name: string;
  sku: string;
  sellingPrice: string;
  costPrice: string;
  stock: string;
  lowStockThreshold: string;
}

const initialForm: ProductForm = {
  name: "",
  sku: "",
  sellingPrice: "",
  costPrice: "",
  stock: "",
  lowStockThreshold: "5",
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Gagal memuat atau menyimpan produk.";

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:bg-slate-950";

const labelClass =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500";

function ProductsSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 p-4 dark:border-slate-800">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 p-4">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="hidden h-4 w-24 sm:block" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function ProductsPage() {
  const businessId = getBusinessId();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (businessId === null) {
        setError("Sesi login tidak ditemukan. Silakan masuk kembali.");
        return;
      }
      const res = await fetchApi(`/businesses/${businessId}/products`);
      setProducts(Array.isArray(res) ? res : []);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (businessId === null) {
        setError("Sesi login tidak ditemukan. Silakan masuk kembali.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetchApi(`/businesses/${businessId}/products`);
        if (cancelled) return;
        setProducts(Array.isArray(res) ? res : []);
        setError("");
      } catch (loadError) {
        if (!cancelled) setError(getErrorMessage(loadError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const lowStockCount = useMemo(
    () =>
      products.filter(
        (product) =>
          Number(product.stock) > 0 && Number(product.stock) <= product.low_stock_threshold
      ).length,
    [products]
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        (product.sku ?? "").toLowerCase().includes(query);

      const stock = Number(product.stock);
      const matchesStock = !onlyLowStock || (stock > 0 && stock <= product.low_stock_threshold);

      return matchesSearch && matchesStock;
    });
  }, [products, search, onlyLowStock]);

  const openAddModal = () => {
    setForm(initialForm);
    setFormError("");
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    if (saving) return;
    setShowAddModal(false);
    setFormError("");
  };

  const updateForm = (field: keyof ProductForm, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleCreateProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");

    if (!form.name.trim()) {
      setFormError("Nama produk wajib diisi.");
      return;
    }

    if (!form.sellingPrice || !form.costPrice) {
      setFormError("Harga beli dan harga jual wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      if (businessId === null) {
        throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
      }
      await fetchApi(`/businesses/${businessId}/products`, {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          sku: form.sku.trim() || null,
          selling_price: Number(form.sellingPrice),
          cost_price: Number(form.costPrice),
          stock: Number(form.stock) || 0,
          low_stock_threshold: Number(form.lowStockThreshold) || 5,
        }),
      });

      setShowAddModal(false);
      setForm(initialForm);
      void loadProducts();
    } catch (createError) {
      setFormError(getErrorMessage(createError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
            Inventaris
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Produk & stok
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola katalog barang dan pantau stok yang perlu segera diisi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {lowStockCount > 0 ? (
            <Badge tone="amber">
              <AlertTriangle className="h-3 w-3" />
              {lowStockCount} stok menipis
            </Badge>
          ) : (
            <Badge tone="emerald">
              <Package className="h-3 w-3" />
              Stok aman
            </Badge>
          )}
          <Button onClick={openAddModal}>
            <Plus className="h-4 w-4" />
            Tambah produk
          </Button>
        </div>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Daftar produk</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {loading
                ? "Memuat katalog produk..."
                : `${formatNumber(filteredProducts.length)} dari ${formatNumber(products.length)} produk`}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari produk atau SKU..."
                aria-label="Cari produk"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:bg-slate-950"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Hapus pencarian"
                  className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setOnlyLowStock((value) => !value)}
              className={cn(
                "h-10 shrink-0 cursor-pointer rounded-xl border px-3 text-xs font-semibold transition active:scale-[0.98]",
                onlyLowStock
                  ? "border-amber-500 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-500/10 dark:text-amber-300"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-white"
              )}
            >
              Stok menipis
            </button>
          </div>
        </div>
      </Card>

      {loading ? (
        <ProductsSkeleton />
      ) : error ? (
        <ErrorState title="Produk gagal dimuat" message={error} onRetry={() => void loadProducts()} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Belum ada produk"
          description="Mulai dengan menambahkan produk pertama Anda agar bisa berjualan di kasir."
          action={
            <Button onClick={openAddModal}>
              <Plus className="h-4 w-4" />
              Tambah produk
            </Button>
          }
        />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Produk tidak ditemukan"
          description="Coba kata kunci lain atau matikan filter stok menipis."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setOnlyLowStock(false);
              }}
            >
              Reset filter
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-500">
                  <th className="px-4 py-3 font-semibold">Produk</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">Harga beli</th>
                  <th className="px-4 py-3 font-semibold">Harga jual</th>
                  <th className="hidden px-4 py-3 font-semibold sm:table-cell">Margin</th>
                  <th className="px-4 py-3 text-right font-semibold">Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProducts.map((product) => {
                  const stock = Number(product.stock);
                  const costPrice = Number(product.cost_price);
                  const sellingPrice = Number(product.selling_price);
                  const margin =
                    sellingPrice > 0
                      ? Math.round(((sellingPrice - costPrice) / sellingPrice) * 100)
                      : 0;
                  const isLow = stock > 0 && stock <= product.low_stock_threshold;
                  const isOut = stock <= 0;

                  return (
                    <tr
                      key={product.id}
                      className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold",
                              getProductTone(product.name)
                            )}
                          >
                            {getInitials(product.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900 dark:text-white">
                              {product.name}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">
                              {product.sku || "Tanpa SKU"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-slate-500 dark:text-slate-400 md:table-cell">
                        {formatRupiah(product.cost_price)}
                      </td>
                      <td className="px-4 py-3 font-bold text-teal-700 dark:text-teal-300">
                        {formatRupiah(product.selling_price)}
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <Badge tone={margin >= 30 ? "emerald" : margin >= 15 ? "amber" : "rose"}>
                          {margin}%
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge
                          tone={isOut ? "rose" : isLow ? "amber" : "emerald"}
                          className="justify-end"
                        >
                          {isOut ? "Habis" : isLow ? `Sisa ${stock}` : `${stock} unit`}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={showAddModal}
        onClose={closeAddModal}
        title="Tambah produk baru"
        description="Isi informasi produk dengan lengkap. Stok awal akan tercatat otomatis."
        footer={
          <>
            <Button variant="outline" onClick={closeAddModal} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" form="product-form" loading={saving}>
              Simpan produk
            </Button>
          </>
        }
        closeOnBackdrop={!saving}
      >
        <form id="product-form" onSubmit={handleCreateProduct} className="space-y-4">
          {formError ? (
            <ErrorState compact title="Produk belum bisa disimpan" message={formError} />
          ) : null}

          <div>
            <label htmlFor="product-name" className={labelClass}>
              Nama produk
            </label>
            <input
              id="product-name"
              type="text"
              required
              autoFocus
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              placeholder="Contoh: Kopi Susu Gula Aren"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="product-sku" className={labelClass}>
              SKU <span className="font-normal normal-case text-slate-400">(opsional)</span>
            </label>
            <input
              id="product-sku"
              type="text"
              value={form.sku}
              onChange={(event) => updateForm("sku", event.target.value)}
              placeholder="Contoh: KOP-001"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="product-cost" className={labelClass}>
                Harga beli
              </label>
              <input
                id="product-cost"
                type="number"
                min="0"
                required
                value={form.costPrice}
                onChange={(event) => updateForm("costPrice", event.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="product-price" className={labelClass}>
                Harga jual
              </label>
              <input
                id="product-price"
                type="number"
                min="0"
                required
                value={form.sellingPrice}
                onChange={(event) => updateForm("sellingPrice", event.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="product-stock" className={labelClass}>
                Stok awal
              </label>
              <input
                id="product-stock"
                type="number"
                min="0"
                value={form.stock}
                onChange={(event) => updateForm("stock", event.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="product-threshold" className={labelClass}>
                Batas stok minimum
              </label>
              <input
                id="product-threshold"
                type="number"
                min="0"
                value={form.lowStockThreshold}
                onChange={(event) => updateForm("lowStockThreshold", event.target.value)}
                placeholder="5"
                className={inputClass}
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
