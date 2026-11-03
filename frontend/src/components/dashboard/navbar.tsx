"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  Store,
  Wallet,
  X,
  AlertTriangle,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Kasir", href: "/dashboard/pos", icon: ShoppingCart },
  { name: "Produk & Stok", href: "/dashboard/products", icon: Package },
  { name: "Pengeluaran", href: "/dashboard/expenses", icon: Wallet },
  { name: "Histori Penjualan", href: "/dashboard/sales", icon: AlertTriangle },
  { name: "Asisten AI", href: "/dashboard/assistant", icon: Bot },
  { name: "Pengaturan", href: "/dashboard/settings", icon: Store },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [accountName, setAccountName] = useState("Akun");
  const [accountRole, setAccountRole] = useState("Pengguna");

  useEffect(() => {
    const refreshAccount = () => {
      const savedSession = localStorage.getItem("user_session");
      if (!savedSession) {
        setAccountName("Akun");
        setAccountRole("Pengguna");
        return;
      }

      try {
        const session = JSON.parse(savedSession) as { fullName?: string; role?: string };
        setAccountName(session.fullName || "Akun");
        setAccountRole(session.role === "OWNER" ? "Pemilik usaha" : session.role || "Pengguna");
      } catch {
        localStorage.removeItem("user_session");
        setAccountName("Akun");
        setAccountRole("Pengguna");
      }
    };

    refreshAccount();
    window.addEventListener("smartpos:session-updated", refreshAccount);
    return () => window.removeEventListener("smartpos:session-updated", refreshAccount);
  }, []);

  const handleLogout = () => {
    setShowLogoutModal(false);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("smartpos_access_token");
    localStorage.removeItem("smartpos_user_id");
    localStorage.removeItem("smartpos_business_id");
    localStorage.removeItem("user_session");
    router.replace("/auth/login");
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm shadow-teal-600/20">
              <Store className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                SmartPOS
              </span>
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 sm:block">
                UMKM Master
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Navigasi utama">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition",
                    active
                      ? "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <div className="hidden items-center gap-2 border-l border-slate-200 pl-2 dark:border-slate-800 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white dark:bg-white dark:text-slate-900">
                {accountName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
              </div>
              <div className="hidden xl:block">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{accountName}</p>
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{accountRole}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300 cursor-pointer"
                aria-label="Keluar"
                title="Keluar"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
              aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="border-t border-slate-200/80 bg-white/95 px-4 py-3 dark:border-slate-800/80 dark:bg-slate-900/95 lg:hidden">
            <nav className="grid grid-cols-2 gap-1.5" aria-label="Navigasi seluler">
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                      active
                        ? "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                setShowLogoutModal(true);
              }}
              className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Keluar dari akun
            </button>
          </div>
        ) : null}
      </header>

      {/* MODAL KONFIRMASI LOGOUT */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs modal-backdrop">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900 modal-panel">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Konfirmasi Keluar</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Apakah Anda yakin ingin keluar?</p>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
              Sesi login Anda akan diakhiri. Pastikan semua transaksi kasir sudah tersimpan.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-center text-xs font-bold text-white shadow-sm transition hover:bg-rose-500 cursor-pointer"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}