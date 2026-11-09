"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bot,
  ChevronUp,
  Clock,
  History,
  LayoutDashboard,
  LogOut,
  Package,
  ScrollText,
  Settings,
  ShoppingCart,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { fetchApi } from "@/lib/api";
import { roleLabel, useSessionRole, type UserRole } from "@/lib/session";

type NavItem = {
  name: string;
  shortName: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles?: UserRole[];
};

const navItems: NavItem[] = [
  {
    name: "Dashboard",
    shortName: "Beranda",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["OWNER", "MANAGER"],
  },
  { name: "Kasir", shortName: "Kasir", href: "/dashboard/pos", icon: ShoppingCart },
  { name: "Produk & Stok", shortName: "Produk", href: "/dashboard/products", icon: Package },
  { name: "Histori Penjualan", shortName: "Penjualan", href: "/dashboard/sales", icon: History },
  { name: "Shift Kasir", shortName: "Shift", href: "/dashboard/shifts", icon: Clock },
  {
    name: "Anggota Tim",
    shortName: "Tim",
    href: "/dashboard/members",
    icon: Users,
    roles: ["OWNER", "MANAGER"],
  },
  {
    name: "Pengeluaran",
    shortName: "Biaya",
    href: "/dashboard/expenses",
    icon: Wallet,
    roles: ["OWNER", "MANAGER"],
  },
  {
    name: "Audit Log",
    shortName: "Audit",
    href: "/dashboard/audit",
    icon: ScrollText,
    roles: ["OWNER", "MANAGER"],
  },
  {
    name: "Asisten AI",
    shortName: "Asisten",
    href: "/dashboard/assistant",
    icon: Bot,
    roles: ["OWNER", "MANAGER"],
  },
  { name: "Pengaturan", shortName: "Pengaturan", href: "/dashboard/settings", icon: Settings },
];

interface UserProfile {
  full_name: string;
  role: string;
  profile_image_url: string | null;
}

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

export function DashboardNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const sessionRole = useSessionRole();
  const [openMorePath, setOpenMorePath] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const refreshProfile = () => {
      void fetchApi("/auth/me").then((nextProfile: UserProfile) => {
        if (active) {
          setProfile(nextProfile);
          setAvatarFailed(false);
        }
      }).catch(() => {
        if (active) setProfile(null);
      });
    };

    refreshProfile();
    window.addEventListener("smartpos:session-updated", refreshProfile);
    return () => {
      active = false;
      window.removeEventListener("smartpos:session-updated", refreshProfile);
    };
  }, []);

  const visibleItems = useMemo(() => {
    if (sessionRole) {
      return navItems.filter((item) => !item.roles || item.roles.includes(sessionRole));
    }
    return navItems.filter((item) => !item.roles);
  }, [sessionRole]);

  const mobileItems = visibleItems.slice(0, 4);
  const moreItems = visibleItems.slice(4);

  const handleLogout = () => {
    setShowLogoutModal(false);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("smartpos_access_token");
    localStorage.removeItem("smartpos_user_id");
    localStorage.removeItem("smartpos_role");
    localStorage.removeItem("smartpos_business_id");
    localStorage.removeItem("user_session");
    router.replace("/auth/login");
  };

  const avatar = profile?.profile_image_url && !avatarFailed ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={profile.profile_image_url}
      alt=""
      className="h-full w-full rounded-full object-cover"
      onError={() => setAvatarFailed(true)}
    />
  ) : (
    <span aria-hidden="true">{profile ? getInitials(profile.full_name) : "?"}</span>
  );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 dark:border-slate-800/80 dark:bg-slate-900/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
          <Link href="/dashboard" className="flex min-w-0 shrink-0 items-center gap-2.5" aria-label="SmartPOS, beranda">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm shadow-teal-700/20">
              <Store className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold tracking-tight text-slate-900 dark:text-white">SmartPOS</span>
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 sm:block">
                {sessionRole ? roleLabel(sessionRole) : "UMKM Master"}
              </span>
            </span>
          </Link>

          <nav className="no-scrollbar hidden min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto md:flex" aria-label="Navigasi utama">
            {visibleItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.name}
                  title={item.name}
                  className={cn(
                    "flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 xl:px-2.5 xl:text-[13px]",
                    active
                      ? "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="hidden xl:inline">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5">
            <ThemeToggle />
            <Link
              href="/dashboard/settings"
              aria-label={profile ? `Pengaturan profil ${profile.full_name}` : "Pengaturan profil"}
              title={profile?.full_name || "Profil"}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-white dark:text-slate-900"
            >
              {avatar}
            </Link>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
              aria-label="Keluar"
              title="Keluar"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.06)] md:hidden dark:border-slate-800 dark:bg-slate-900/95"
        aria-label="Navigasi seluler"
      >
        <div className="mx-auto flex min-h-[4.25rem] max-w-lg items-stretch justify-around px-1 pt-1.5">
          {mobileItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[10px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600",
                  active ? "text-teal-700 dark:text-teal-300" : "text-slate-500 dark:text-slate-400"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} aria-hidden="true" />
                <span className="max-w-full truncate">{item.shortName}</span>
              </Link>
            );
          })}
          {moreItems.length > 0 ? (
            <button
              type="button"
              aria-expanded={openMorePath === pathname}
              aria-controls="mobile-more-menu"
              onClick={() => setOpenMorePath((openPath) => openPath === pathname ? null : pathname)}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[10px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600",
                openMorePath === pathname || moreItems.some((item) => isActivePath(pathname, item.href))
                  ? "text-teal-700 dark:text-teal-300"
                  : "text-slate-500 dark:text-slate-400"
              )}
            >
              {openMorePath === pathname ? <ChevronUp className="h-5 w-5" aria-hidden="true" /> : <Store className="h-5 w-5" aria-hidden="true" />}
              <span>Lainnya</span>
            </button>
          ) : null}
        </div>
      </nav>

      {openMorePath === pathname && moreItems.length > 0 && (
        <div
          id="mobile-more-menu"
          className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-2 shadow-xl md:hidden dark:border-slate-700 dark:bg-slate-900"
        >
          <nav aria-label="Navigasi lainnya" className="grid grid-cols-3 gap-1">
            {moreItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-semibold",
                    active
                      ? "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {item.shortName}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {showLogoutModal && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            className="modal-panel w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 id="logout-title" className="text-base font-bold text-slate-900 dark:text-white">Konfirmasi Keluar</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Apakah Anda yakin ingin keluar?</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
              Pastikan transaksi kasir yang sedang dikerjakan sudah tersimpan.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="min-h-11 flex-1 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="min-h-11 flex-1 rounded-xl bg-rose-600 px-3 text-xs font-bold text-white transition hover:bg-rose-500"
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
