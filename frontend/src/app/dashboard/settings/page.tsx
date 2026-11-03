"use client";

import { useState, useEffect } from "react";
import {
  Store,
  Palette,
  ShieldCheck,
  Type,
  CheckCircle2,
  Save,
  Building,
  MapPin,
  Lock,
  RefreshCw,
  User,
  Mail,
  BadgeCheck,
} from "lucide-react";
import { fetchApi, getBusinessId } from "@/lib/api";

interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

interface BusinessProfile {
  id: number;
  name: string;
  category: string;
  location: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"appearance" | "store" | "profile" | "security">("appearance");

  // State Appearance Settings
  const [fontFamily, setFontFamily] = useState<string>("dn-rounded");
  const [fontSize, setFontSize] = useState<string>("medium");
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // State Store Info
  const [storeName, setStoreName] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [loadingStore, setLoadingStore] = useState<boolean>(false);

  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string>("");
  const [securityError, setSecurityError] = useState<string>("");
  const [loadingPassword, setLoadingPassword] = useState<boolean>(false);

  // State Security
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const applyThemeSettings = (font: string, size: string) => {
    const root = document.documentElement;
    root.classList.remove("font-dn-rounded", "font-inter", "font-system");
    root.classList.remove("font-size-small", "font-size-medium", "font-size-large");
    root.classList.add(`font-${font}`);
    root.classList.add(`font-size-${size}`);
  };

  useEffect(() => {
    // Ambil preferensi tampilan
    const savedFont = localStorage.getItem("app_font_family") || "dn-rounded";
    const savedSize = localStorage.getItem("app_font_size") || "medium";
    setFontFamily(savedFont);
    setFontSize(savedSize);
    applyThemeSettings(savedFont, savedSize);

    const businessId = getBusinessId();
    if (businessId === null) {
      setDataError("Sesi bisnis tidak ditemukan. Silakan masuk kembali.");
      setLoadingData(false);
      return;
    }

    void Promise.all([
      fetchApi("/auth/me") as Promise<UserProfile>,
      fetchApi(`/businesses/${businessId}`) as Promise<BusinessProfile>,
    ]).then(([profile, business]) => {
      setFullName(profile.full_name);
      setEmail(profile.email);
      setRole(profile.role);
      setStoreName(business.name);
      setCategory(business.category);
      setLocation(business.location);
    }).catch((error: unknown) => {
      setDataError(error instanceof Error ? error.message : "Gagal memuat data akun dan bisnis.");
    }).finally(() => setLoadingData(false));
  }, []);

  const handleSaveAppearance = () => {
    localStorage.setItem("app_font_family", fontFamily);
    localStorage.setItem("app_font_size", fontSize);
    applyThemeSettings(fontFamily, fontSize);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);
    setDataError("");
    try {
      const profile = await fetchApi("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ full_name: fullName.trim(), email: email.trim() }),
      }) as UserProfile;
      setFullName(profile.full_name);
      setEmail(profile.email);
      const sessionData = localStorage.getItem("user_session");
      const userSession = sessionData ? JSON.parse(sessionData) : {};
      localStorage.setItem("user_session", JSON.stringify({
        ...userSession,
        fullName: profile.full_name,
        email: profile.email,
        role: profile.role,
      }));
      window.dispatchEvent(new Event("smartpos:session-updated"));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Gagal menyimpan profil akun.");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSaveStoreInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingStore(true);
    setDataError("");
    const businessId = getBusinessId();
    try {
      if (businessId === null) throw new Error("Sesi bisnis tidak ditemukan. Silakan masuk kembali.");
      const business = await fetchApi(`/businesses/${businessId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: storeName.trim(),
          category: category.trim(),
          location: location.trim(),
        }),
      }) as BusinessProfile;
      setStoreName(business.name);
      setCategory(business.category);
      setLocation(business.location);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Gagal menyimpan data toko.");
    } finally {
      setLoadingStore(false);
    }
  };

  const handleUpdatePassword = async () => {
    setSecurityError("");
    if (newPassword.length < 8) {
      setSecurityError("Kata sandi baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setLoadingPassword(true);
    try {
      await fetchApi("/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSecurityError(error instanceof Error ? error.message : "Gagal mengubah kata sandi.");
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Pengaturan Sistem
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            Kelola preferensi antarmuka, profil akun aktif, informasi toko, dan keamanan.
          </p>
        </div>
      </div>

      {dataError && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          {dataError}
        </div>
      )}
      {loadingData && <p className="mt-4 text-xs text-slate-500">Memuat data akun dan bisnis...</p>}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("appearance")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
            activeTab === "appearance"
              ? "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
              : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
          }`}
        >
          <Palette className="h-4 w-4" />
          Tampilan UI
        </button>

        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
            activeTab === "profile"
              ? "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
              : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
          }`}
        >
          <User className="h-4 w-4" />
          Profil Akun
        </button>

        <button
          onClick={() => setActiveTab("store")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
            activeTab === "store"
              ? "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
              : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
          }`}
        >
          <Store className="h-4 w-4" />
          Profil Toko
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
            activeTab === "security"
              ? "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
              : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Keamanan
        </button>
      </div>

      {saveSuccess && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          Perubahan berhasil disimpan!
        </div>
      )}

      {/* TAB 1: TAMPILAN */}
      {activeTab === "appearance" && (
        <div className="mt-6 max-w-3xl space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Type className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              Tipografi & Font Family
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div
                onClick={() => setFontFamily("dn-rounded")}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  fontFamily === "dn-rounded"
                    ? "border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20 dark:bg-teal-500/10"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                }`}
              >
                <p className="text-sm font-bold text-slate-900 dark:text-white">DN Rounded</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Standar Ekosistem Khwarizmi</p>
              </div>

              <div
                onClick={() => setFontFamily("inter")}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  fontFamily === "inter"
                    ? "border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20 dark:bg-teal-500/10"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                }`}
              >
                <p className="text-sm font-bold text-slate-900 dark:text-white">Inter Sans</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Modern & bersih</p>
              </div>

              <div
                onClick={() => setFontFamily("system")}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  fontFamily === "system"
                    ? "border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20 dark:bg-teal-500/10"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                }`}
              >
                <p className="text-sm font-bold text-slate-900 dark:text-white">System Default</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Bawaan OS</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Ukuran Teks UI</h2>
            <div className="mt-4 flex gap-3">
              {["small", "medium", "large"].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setFontSize(size)}
                  className={`capitalize rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                    fontSize === size
                      ? "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400"
                  }`}
                >
                  {size === "small" ? "Kecil" : size === "medium" ? "Sedang" : "Besar"}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveAppearance}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-teal-500 cursor-pointer"
          >
            <Save className="h-4 w-4" /> Simpan Tampilan
          </button>
        </div>
      )}

      {/* TAB 2: PROFIL AKUN DINAMIS */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveProfile} className="mt-6 max-w-2xl space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500 text-base font-bold text-white shadow-sm">
                {fullName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{fullName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                  <BadgeCheck className="h-3.5 w-3.5 text-teal-600" />
                  Role: <span className="font-semibold uppercase text-teal-600">{role}</span>
                </p>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <User className="h-3.5 w-3.5" /> Nama Lengkap Sesi Ini
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <Mail className="h-3.5 w-3.5" /> Email Akun
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingProfile}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-50 cursor-pointer"
          >
            {loadingProfile ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Profil Akun
          </button>
        </form>
      )}

      {/* TAB 3: PROFIL TOKO */}
      {activeTab === "store" && (
        <form onSubmit={handleSaveStoreInfo} className="mt-6 max-w-2xl space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Usaha / Toko</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Alamat Toko</label>
              <textarea
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kategori Usaha</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loadingStore}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-teal-500 cursor-pointer"
          >
            {loadingStore ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Perbarui Toko
          </button>
        </form>
      )}

      {/* TAB 4: KEAMANAN */}
      {activeTab === "security" && (
        <div className="mt-6 max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <Lock className="h-4 w-4 text-teal-600" /> Ubah Kata Sandi
          </h2>
          <div className="space-y-3">
            <input
              type="password"
              placeholder="Password Saat Ini"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
            <input
              type="password"
              placeholder="Password Baru"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>
          <input
            type="password"
            placeholder="Konfirmasi Password Baru"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
          {securityError && <p className="text-xs font-medium text-rose-600">{securityError}</p>}
          <button
            type="button"
            onClick={handleUpdatePassword}
            disabled={loadingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-50 cursor-pointer"
          >
            {loadingPassword ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Update Kata Sandi
          </button>
        </div>
      )}
    </div>
  );
}