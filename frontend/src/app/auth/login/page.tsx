"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, Lock, User, KeyRound, CheckCircle2, ArrowRight } from "lucide-react";
import { fetchApi } from "@/lib/api";

interface AuthResponse {
  access_token: string;
  token_type: string;
  role: string;
  full_name: string;
  user_id: number;
  business_id: number | null;
}

export default function LoginPage() {
  const router = useRouter();
  
  // State Login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Modal Forgot Password
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Modal Register
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regBusinessName, setRegBusinessName] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState("");

  const isFormValid = username.trim().length > 0 && password.trim().length > 0;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const session = await fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: username.trim(), password }),
      }) as AuthResponse;

      localStorage.setItem("smartpos_access_token", session.access_token);
      localStorage.setItem("smartpos_user_id", String(session.user_id));
      if (session.business_id !== null) {
        localStorage.setItem("smartpos_business_id", String(session.business_id));
      } else {
        localStorage.removeItem("smartpos_business_id");
      }
      localStorage.setItem("user_session", JSON.stringify({
        id: session.user_id,
        fullName: session.full_name,
        email: username.trim(),
        role: session.role,
        businessId: session.business_id,
      }));
      router.push("/dashboard");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Gagal masuk. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setLoading(true);

    try {
      const session = await fetchApi("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: regName.trim(),
          business_name: regBusinessName.trim(),
          email: regEmail.trim(),
          password: regPassword,
        }),
      }) as AuthResponse;

      localStorage.setItem("smartpos_access_token", session.access_token);
      localStorage.setItem("smartpos_user_id", String(session.user_id));
      if (session.business_id !== null) {
        localStorage.setItem("smartpos_business_id", String(session.business_id));
      }
      localStorage.setItem("user_session", JSON.stringify({
        id: session.user_id,
        fullName: session.full_name,
        email: regEmail.trim(),
        role: session.role,
        businessId: session.business_id,
      }));
      setRegSuccess(true);
      setRegName("");
      setRegEmail("");
      setRegPassword("");
      setRegBusinessName("");
      setTimeout(() => setShowRegisterModal(false), 700);
      router.push("/dashboard");
    } catch (error) {
      setRegError(error instanceof Error ? error.message : "Gagal mendaftarkan akun.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-600/20 mb-3">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">SmartPOS Login</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Masuk untuk mengelola sistem kasir & bisnis UMKM
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                placeholder="nama@toko.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-900 outline-none focus:border-teal-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Kata Sandi
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs font-semibold text-teal-600 hover:underline dark:text-teal-400 cursor-pointer"
              >
                Lupa password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-900 outline-none focus:border-teal-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!isFormValid || loading}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition shadow-sm ${
              isFormValid && !loading
                ? "bg-teal-600 text-white hover:bg-teal-500 active:scale-95 cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600"
            }`}
          >
            {loading ? "Memproses..." : <>Masuk ke Sistem <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-100 pt-4 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Belum punya akun toko?{" "}
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className="font-bold text-teal-600 hover:underline dark:text-teal-400 cursor-pointer"
            >
              Daftar sekarang
            </button>
          </p>
        </div>
      </div>

      {/* Modal Lupa Password */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs modal-backdrop">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900 modal-panel">
            <div className="flex items-center gap-2.5 mb-3">
              <KeyRound className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Pemulihan Password</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Reset kata sandi melalui email belum tersedia. Setelah masuk, kata sandi bisa diganti dari menu Keamanan.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="mt-4 w-full rounded-xl bg-teal-600 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-teal-500 cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* Modal Registrasi Akun */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs modal-backdrop">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900 modal-panel">
            <div className="flex items-center gap-2.5 mb-3">
              <Store className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Daftar Akun Baru</h3>
            </div>
            {regError && (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                {regError}
              </div>
            )}
            {regSuccess ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                Akun dan bisnis berhasil dibuat. Mengalihkan ke Dashboard...
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    placeholder="Contoh: Toko Berkah"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Alamat Email</label>
                  <input
                    type="email"
                    placeholder="email@toko.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Nama Usaha / Toko</label>
                  <input
                    type="text"
                    placeholder="Nama usaha / toko"
                    value={regBusinessName}
                    onChange={(e) => setRegBusinessName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Kata Sandi</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(false)}
                    className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-xl bg-teal-600 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-teal-500 cursor-pointer"
                  >
                    Daftar & Masuk
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}