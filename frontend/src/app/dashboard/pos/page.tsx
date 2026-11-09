"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Minus,
  Package,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingCart,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { fetchApi, getBusinessId } from "@/lib/api";
import { useTodayLabel } from "@/lib/use-today";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
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

interface CartItem {
  product: Product;
  quantity: number;
}

interface SaleResult {
  id?: number;
  transaction_number: string;
  total_amount: number | string;
  amount_received: number | string;
  change_amount: number | string;
  payment_method: string;
}

type StockFilter = "all" | "available" | "low" | "out";
type PaymentMethod = "CASH" | "TRANSFER";

const stockFilters: Array<{ key: StockFilter; label: string }> = [
  { key: "all", label: "Semua produk" },
  { key: "available", label: "Tersedia" },
  { key: "low", label: "Stok menipis" },
  { key: "out", label: "Habis" },
];

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Terjadi kesalahan saat memproses permintaan.";

const createIdempotencyKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `checkout-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="p-4">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <Skeleton className="mt-4 h-4 w-4/5" />
          <Skeleton className="mt-2 h-3 w-1/2" />
          <div className="mt-5 flex items-end justify-between">
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-10" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function POSPage() {
  const businessId = getBusinessId();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountInput, setDiscountInput] = useState("0");

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [amountReceived, setAmountReceived] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [lastSale, setLastSale] = useState<SaleResult | null>(null);
  const checkoutKeyRef = useRef<string | null>(null);
  const today = useTodayLabel();
  const [activeShift, setActiveShift] = useState<{ id: number; opened_at: string } | null>(null);

  const loadProducts = useCallback(
    async (options?: { background?: boolean }) => {
      const background = options?.background ?? false;

      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setError("");
      }

      try {
        if (businessId === null) {
          setError("Sesi login tidak ditemukan. Silakan masuk kembali.");
          return;
        }
        const data = await fetchApi(`/businesses/${businessId}/products`);
        setProducts(Array.isArray(data) ? data : []);
        setError("");
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      } finally {
        if (background) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [businessId]
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (businessId === null) {
        setError("Sesi login tidak ditemukan. Silakan masuk kembali.");
        setLoading(false);
        return;
      }
      try {
        const data = await fetchApi(`/businesses/${businessId}/products`);
        if (cancelled) return;
        setProducts(Array.isArray(data) ? data : []);
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

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (businessId === null) return;
      try {
        const data = await fetchApi(`/businesses/${businessId}/shifts/active`);
        if (!cancelled) {
          setActiveShift(data && typeof data === "object" ? (data as { id: number; opened_at: string }) : null);
        }
      } catch {
        if (!cancelled) setActiveShift(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const cartQuantities = useMemo(
    () => new Map(cart.map((item) => [item.product.id, item.quantity])),
    [cart]
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const stock = Number(product.stock);
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        (product.sku ?? "").toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (stockFilter === "available") return stock > 0;
      if (stockFilter === "low") return stock > 0 && stock <= product.low_stock_threshold;
      if (stockFilter === "out") return stock <= 0;

      return true;
    });
  }, [products, search, stockFilter]);

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.product.selling_price) * item.quantity,
    0
  );
  const discount = Math.min(subtotal, Math.max(0, Number(discountInput) || 0));
  const total = Math.max(0, subtotal - discount);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const received = Number(amountReceived) || 0;
  const change = Math.max(0, received - total);
  const shortfall = Math.max(0, total - received);
  const isCash = paymentMethod === "CASH";
  const canPay = cart.length > 0 && (!isCash || received >= total);

  const quickAmounts = useMemo(() => {
    if (total <= 0) return [];
    const rounded = Math.ceil(total / 10000) * 10000;
    return Array.from(
      new Set([total, rounded, rounded + 10000, rounded + 20000, rounded + 50000, 100000])
    )
      .filter((value) => value >= total)
      .sort((a, b) => a - b)
      .slice(0, 6);
  }, [total]);

  const addToCart = (product: Product) => {
    const stock = Number(product.stock);
    if (stock <= 0) return;

    setCart((previous) => {
      const existing = previous.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= stock) return previous;
        return previous.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...previous, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((previous) =>
      previous
        .map((item) => {
          if (item.product.id !== productId) return item;

          const stock = Number(item.product.stock);
          const nextQuantity = Math.min(stock, Math.max(0, item.quantity + delta));
          return { ...item, quantity: nextQuantity };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (productId: number) => {
    setCart((previous) => previous.filter((item) => item.product.id !== productId));
  };

  const openPayment = () => {
    if (cart.length === 0) return;
    setCheckoutError("");
    setLastSale(null);
    setAmountReceived(paymentMethod === "CASH" ? "" : String(total));
    setPaymentOpen(true);
  };

  const closePayment = () => {
    if (checkoutLoading) return;
    setPaymentOpen(false);
    setCheckoutError("");
    setLastSale(null);
  };

  const selectPaymentMethod = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setCheckoutError("");
    setAmountReceived(method === "CASH" ? "" : String(total));
  };

  const handleCheckout = async () => {
    setCheckoutError("");

    if (cart.length === 0) {
      setCheckoutError("Keranjang masih kosong.");
      return;
    }

    const receivedValue = isCash ? received : total;

    if (isCash && receivedValue < total) {
      setCheckoutError("Uang yang diterima masih kurang dari total tagihan.");
      return;
    }

    setCheckoutLoading(true);

    const idempotencyKey = checkoutKeyRef.current ?? createIdempotencyKey();
    checkoutKeyRef.current = idempotencyKey;

    try {
      if (businessId === null) {
        throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
      }
      const sale = await fetchApi(`/businesses/${businessId}/sales/checkout`, {
        method: "POST",
        body: JSON.stringify({
          payment_method: paymentMethod,
          amount_received: receivedValue,
          discount,
          idempotency_key: idempotencyKey,
          items: cart.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
          })),
        }),
      });

      checkoutKeyRef.current = null;
      setLastSale(sale);
      setCart([]);
      setDiscountInput("0");
      setAmountReceived("");
      void loadProducts({ background: true });
    } catch (checkoutFailure) {
      setCheckoutError(getErrorMessage(checkoutFailure));
    } finally {
      setCheckoutLoading(false);
    }
  };

  const finishTransaction = () => {
    checkoutKeyRef.current = null;
    setPaymentOpen(false);
    setLastSale(null);
    setCheckoutError("");
    setAmountReceived("");
  };

  const resetFilters = () => {
    setSearch("");
    setStockFilter("all");
  };

  const paymentFooter = lastSale ? (
    <Button onClick={finishTransaction} className="w-full sm:w-auto">
      <Plus className="h-4 w-4" />
      Transaksi baru
    </Button>
  ) : (
    <>
      <Button variant="outline" onClick={closePayment} disabled={checkoutLoading}>
        Batal
      </Button>
      <Button onClick={handleCheckout} loading={checkoutLoading} disabled={!canPay}>
        <CheckCircle2 className="h-4 w-4" />
        Konfirmasi pembayaran
      </Button>
    </>
  );

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
            Kasir
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Transaksi baru
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pilih produk, atur jumlah, lalu selesaikan pembayaran.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/shifts"
            title={activeShift ? "Kelola shift kasir" : "Buka shift terlebih dahulu"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset transition",
              activeShift
                ? "bg-emerald-50 text-emerald-700 ring-emerald-600/10 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20"
                : "bg-amber-50 text-amber-700 ring-amber-600/10 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20"
            )}
          >
            <Clock className="h-3 w-3" />
            {activeShift ? "Shift aktif" : "Belum buka shift"}
          </Link>
          <Badge tone="emerald">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            POS siap
          </Badge>
          <Badge tone="slate">
            <CalendarDays className="h-3 w-3" />
            {today}
          </Badge>
          <button
            type="button"
            onClick={() => void loadProducts({ background: true })}
            disabled={refreshing}
            className="flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-900 active:scale-95 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-white"
          >
            <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
            Muat ulang
          </button>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <section className="min-w-0 space-y-4" aria-label="Katalog produk">
          <Card className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Katalog produk
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {loading
                    ? "Memuat produk usaha..."
                    : `${formatNumber(filteredProducts.length)} dari ${formatNumber(products.length)} produk`}
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama atau SKU..."
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
            </div>

            <div className="no-scrollbar mt-4 flex gap-1.5 overflow-x-auto">
              {stockFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setStockFilter(filter.key)}
                  className={cn(
                    "shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98]",
                    stockFilter === filter.key
                      ? "border-teal-600 bg-teal-600 text-white shadow-sm shadow-teal-600/20 dark:border-teal-500 dark:bg-teal-500 dark:text-slate-950"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-white"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </Card>

          {error && products.length > 0 ? (
            <ErrorState
              compact
              title="Gagal memperbarui produk"
              message={error}
              onRetry={() => void loadProducts({ background: true })}
            />
          ) : null}

          {loading ? (
            <ProductGridSkeleton />
          ) : error && products.length === 0 ? (
            <ErrorState
              title="Produk gagal dimuat"
              message={error}
              onRetry={() => void loadProducts()}
            />
          ) : products.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Belum ada produk"
              description="Tambahkan produk terlebih dahulu agar bisa mulai berjualan di kasir."
              action={
                <Link href="/dashboard/products" className={buttonStyles({ size: "sm" })}>
                  <Plus className="h-3.5 w-3.5" />
                  Tambah produk
                </Link>
              }
            />
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Produk tidak ditemukan"
              description="Coba kata kunci lain atau reset filter stok untuk melihat semua produk."
              action={
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Reset filter
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filteredProducts.map((product) => {
                const stock = Number(product.stock);
                const inCart = cartQuantities.get(product.id) ?? 0;
                const isOut = stock <= 0;
                const isLow = !isOut && stock <= product.low_stock_threshold;
                const atMax = inCart >= stock;
                const disabled = isOut || atMax;

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addToCart(product)}
                    disabled={disabled}
                    aria-label={
                      isOut
                        ? `${product.name} habis`
                        : atMax
                          ? `${product.name} sudah mencapai jumlah maksimum`
                          : `Tambahkan ${product.name} ke keranjang`
                    }
                    className={cn(
                      "group relative flex cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-700",
                      disabled && "cursor-not-allowed opacity-60 hover:translate-y-0 hover:border-slate-200 hover:shadow-sm dark:hover:border-slate-800"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-xl text-sm font-extrabold",
                          getProductTone(product.name)
                        )}
                      >
                        {getInitials(product.name)}
                      </span>
                      <Badge tone={isOut ? "rose" : isLow ? "amber" : "emerald"}>
                        {isOut ? "Habis" : isLow ? `Sisa ${stock}` : `Stok ${stock}`}
                      </Badge>
                    </div>

                    <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-5 text-slate-900 dark:text-white">
                      {product.name}
                    </h3>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">
                      {product.sku || "Tanpa SKU"}
                    </p>

                    <div className="mt-3 flex items-end justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                          Harga
                        </p>
                        <p className="text-sm font-extrabold text-teal-700 dark:text-teal-300">
                          {formatRupiah(product.selling_price)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition group-hover:bg-teal-600 group-hover:text-white dark:bg-slate-800 dark:text-slate-300",
                          disabled && "group-hover:bg-slate-100 group-hover:text-slate-500 dark:group-hover:bg-slate-800 dark:group-hover:text-slate-300"
                        )}
                      >
                        {atMax && !isOut ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </span>
                    </div>

                    {inCart > 0 ? (
                      <p className="mt-2 text-[10px] font-semibold text-teal-600 dark:text-teal-400">
                        {inCart} di keranjang
                        {atMax ? " · maks." : ""}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside
          id="cart-panel"
          className="scroll-mt-24 lg:sticky lg:top-24"
          aria-label="Keranjang belanja"
        >
          <Card className="flex flex-col overflow-hidden lg:max-h-[calc(100vh-7.5rem)]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                  <ShoppingCart className="h-4 w-4" />
                  {itemCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-600 px-1 text-[9px] font-bold text-white dark:bg-teal-500 dark:text-slate-950">
                      {itemCount > 99 ? "99+" : itemCount}
                    </span>
                  ) : null}
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Pesanan</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {itemCount > 0 ? `${formatNumber(itemCount)} item dipilih` : "Belum ada item"}
                  </p>
                </div>
              </div>

              {cart.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="cursor-pointer rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 active:scale-95 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                >
                  Kosongkan
                </button>
              ) : null}
            </div>

            <div className="flex-1 overflow-y-auto px-4">
              {cart.length === 0 ? (
                <div className="py-2">
                  <EmptyState
                    compact
                    icon={ShoppingCart}
                    title="Keranjang kosong"
                    description="Pilih produk di katalog untuk menambahkan pesanan."
                  />
                </div>
              ) : (
                cart.map((item) => {
                  const stock = Number(item.product.stock);
                  const lineTotal = Number(item.product.selling_price) * item.quantity;

                  return (
                    <div
                      key={item.product.id}
                      className="flex gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800"
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold",
                          getProductTone(item.product.name)
                        )}
                      >
                        {getInitials(item.product.name)}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {item.product.name}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">
                              {formatRupiah(item.product.selling_price)} / item
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.product.id)}
                            aria-label={`Hapus ${item.product.name}`}
                            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-300 transition hover:bg-rose-50 hover:text-rose-500 active:scale-95 dark:text-slate-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, -1)}
                              aria-label={`Kurangi jumlah ${item.product.name}`}
                              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-l-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-bold text-slate-900 dark:text-white">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, 1)}
                              disabled={item.quantity >= stock}
                              aria-label={`Tambah jumlah ${item.product.name}`}
                              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-r-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {formatRupiah(lineTotal)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/80">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatRupiah(subtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <label htmlFor="discount" className="text-slate-500 dark:text-slate-400">
                    Diskon
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400">
                      Rp
                    </span>
                    <input
                      id="discount"
                      inputMode="numeric"
                      value={discountInput}
                      onChange={(event) =>
                        setDiscountInput(event.target.value.replace(/\D/g, "").slice(0, 9))
                      }
                      placeholder="0"
                      aria-label="Nominal diskon"
                      className="h-8 w-24 rounded-lg border border-slate-200 bg-white pl-7 pr-2 text-right text-xs font-semibold text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="flex items-end justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Total bayar
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {discount > 0 ? `Hemat ${formatRupiah(discount)}` : "Belum termasuk diskon"}
                    </p>
                  </div>
                  <p className="text-xl font-black tracking-tight text-teal-700 dark:text-teal-300">
                    {formatRupiah(total)}
                  </p>
                </div>
              </div>

              <Button
                size="lg"
                onClick={openPayment}
                disabled={cart.length === 0}
                className="mt-3 w-full"
              >
                <span className="flex w-full items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ReceiptText className="h-4 w-4" />
                    Bayar sekarang
                  </span>
                  <span className="text-xs font-bold">{formatRupiah(total)}</span>
                </span>
              </Button>
            </div>
          </Card>
        </aside>
      </div>

      {cart.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 p-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90 lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {formatNumber(itemCount)} item
              </p>
              <p className="truncate text-base font-extrabold text-slate-900 dark:text-white">
                {formatRupiah(total)}
              </p>
            </div>
            <Button
              onClick={() =>
                document.getElementById("cart-panel")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
            >
              <ShoppingCart className="h-4 w-4" />
              Lihat keranjang
            </Button>
          </div>
        </div>
      ) : null}

      <Modal
        open={paymentOpen}
        onClose={closePayment}
        title={lastSale ? "Transaksi berhasil" : "Pembayaran"}
        description={
          lastSale
            ? "Transaksi sudah tercatat dan stok produk otomatis diperbarui."
            : "Periksa total tagihan dan pilih metode pembayaran."
        }
        footer={paymentFooter}
        closeOnBackdrop={!checkoutLoading}
      >
        {lastSale ? (
          <div className="py-1 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/10">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <p className="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {formatRupiah(lastSale.total_amount)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {lastSale.payment_method === "CASH"
                ? "Pembayaran tunai diterima."
                : "Transaksi dicatat sebagai transfer. Verifikasi dana dilakukan manual, belum melalui penyedia pembayaran."}
            </p>

            <div className="mt-5 space-y-2.5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-left text-xs dark:border-slate-700 dark:bg-slate-950/40">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400">No. transaksi</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {lastSale.transaction_number}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400">Diterima</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatRupiah(lastSale.amount_received)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2.5 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">Kembalian</span>
                <span className="text-sm font-extrabold text-teal-700 dark:text-teal-300">
                  {formatRupiah(lastSale.change_amount)}
                </span>
              </div>
            </div>

            <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500">
              Stok produk sudah diperbarui. Siap melayani transaksi berikutnya.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 p-4 text-white shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-teal-50">Total tagihan</span>
                <ReceiptText className="h-4 w-4 text-teal-100" />
              </div>
              <p className="mt-1 text-3xl font-black tracking-tight">{formatRupiah(total)}</p>
              <p className="mt-1 text-[11px] text-teal-50/90">
                {formatNumber(itemCount)} item · Diskon {formatRupiah(discount)}
              </p>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Metode pembayaran
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => selectPaymentMethod("CASH")}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-left transition active:scale-[0.98]",
                    isCash
                      ? "border-teal-500 bg-teal-50 ring-2 ring-teal-500/20 dark:border-teal-500 dark:bg-teal-500/10"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      isCash
                        ? "bg-teal-600 text-white dark:bg-teal-500 dark:text-slate-950"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                    )}
                  >
                    <Banknote className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">
                      Tunai
                    </span>
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                      Uang fisik
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => selectPaymentMethod("TRANSFER")}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-left transition active:scale-[0.98]",
                    !isCash
                      ? "border-teal-500 bg-teal-50 ring-2 ring-teal-500/20 dark:border-teal-500 dark:bg-teal-500/10"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      !isCash
                        ? "bg-teal-600 text-white dark:bg-teal-500 dark:text-slate-950"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                    )}
                  >
                    <CreditCard className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">
                      Transfer
                    </span>
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                      Bank / e-wallet
                    </span>
                  </span>
                </button>
              </div>
            </div>

            {isCash ? (
              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Uang cepat
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {quickAmounts.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAmountReceived(String(value))}
                        className={cn(
                          "cursor-pointer rounded-xl border px-2 py-2 text-xs font-semibold transition active:scale-[0.98]",
                          received === value
                            ? "border-teal-500 bg-teal-50 text-teal-700 dark:border-teal-500 dark:bg-teal-500/10 dark:text-teal-300"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
                        )}
                      >
                        {value === total ? "Uang pas" : formatRupiah(value)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="amount-received"
                    className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400"
                  >
                    Uang diterima
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      id="amount-received"
                      inputMode="numeric"
                      autoFocus
                      value={amountReceived}
                      onChange={(event) =>
                        setAmountReceived(event.target.value.replace(/\D/g, "").slice(0, 12))
                      }
                      placeholder="0"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-3 text-lg font-extrabold text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:focus:border-teal-500 dark:focus:bg-slate-950"
                    />
                  </div>
                </div>

                <div
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-3",
                    shortfall > 0
                      ? "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"
                      : "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      shortfall > 0
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-emerald-700 dark:text-emerald-300"
                    )}
                  >
                    {shortfall > 0 ? "Kurang" : "Kembalian"}
                  </span>
                  <span
                    className={cn(
                      "text-lg font-extrabold",
                      shortfall > 0
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-emerald-700 dark:text-emerald-300"
                    )}
                  >
                    {shortfall > 0 ? formatRupiah(shortfall) : formatRupiah(change)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-500/30 dark:bg-sky-500/10">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm dark:bg-slate-900 dark:text-sky-300">
                    <CreditCard className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-sky-900 dark:text-sky-100">
                      Nominal transfer {formatRupiah(total)}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-sky-700/80 dark:text-sky-200/80">
                      Pastikan dana sudah diterima di rekening usaha sebelum konfirmasi. Aplikasi
                      mencatat metode pembayaran, bukan status verifikasi dari bank.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {checkoutError ? (
              <ErrorState compact title="Pembayaran belum bisa diproses" message={checkoutError} />
            ) : null}

            <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              <Store className="h-3 w-3" />
              Transaksi disimpan ke laporan usaha. Transfer diverifikasi manual.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
