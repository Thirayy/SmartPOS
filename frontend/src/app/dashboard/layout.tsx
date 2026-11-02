"react";
import Link from "next/link";
import { LayoutDashboard, ShoppingCart, Package, Receipt, Wallet, Bot, LogOut } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Kasir (POS)", href: "/dashboard/pos", icon: ShoppingCart },
    { name: "Produk & Stok", href: "/dashboard/products", icon: Package },
    { name: "Riwayat Transaksi", href: "/dashboard/sales", icon: Receipt },
    { name: "Pengeluaran", href: "/dashboard/expenses", icon: Wallet },
    { name: "Asisten AI", href: "/dashboard/assistant", icon: Bot },
  ];

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Floating Glass Navbar */}
      <header className="sticky top-0 z-50 px-6 py-4">
        <nav className="max-w-7xl mx-auto glass-nav rounded-2xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#28665A] flex items-center text-white font-bold text-lg justify-center shadow-sm">
              POS
            </div>
            <div>
              <span className="font-bold text-gray-800 text-lg tracking-tight">SmartPOS</span>
              <span className="text-xs block text-gray-500 font-medium">UMKM Master System</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-[#28665A] hover:bg-white/60 transition"
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6">
        {children}
      </main>
    </div>
  );
}