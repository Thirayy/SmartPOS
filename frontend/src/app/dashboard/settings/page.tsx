"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import {
  Store,
  Palette,
  ShieldCheck,
  Type,
  CheckCircle2,
  Save,
  Lock,
  RefreshCw,
  User,
  Mail,
  BadgeCheck,
  Camera,
} from "lucide-react";
import { fetchApi, getBusinessId } from "@/lib/api";
import { isOwnerRole, useSessionRole } from "@/lib/session";

interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role: string;
  profile_image_url: string | null;
}

interface BusinessProfile {
  id: number;
  name: string;
  category: string;
  location: string;
}

function subscribeAppearance(callback: () => void) {
  window.addEventListener("smartpos:appearance-updated", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("smartpos:appearance-updated", callback);
    window.removeEventListener("storage", callback);
  };
}

function getSavedFont() {
  const saved = typeof window === "undefined" ? null : localStorage.getItem("app_font_family");
  return saved && ["dn-rounded", "inter", "system"].includes(saved) ? saved : "dn-rounded";
}

function getSavedFontSize() {
  const saved = typeof window === "undefined" ? null : localStorage.getItem("app_font_size");
  return saved && ["small", "medium", "large"].includes(saved) ? saved : "medium";
}

export default function SettingsPage() {
  const sessionRole = useSessionRole();
  const isOwner = isOwnerRole(sessionRole);
  const [activeTab, setActiveTab] = useState<"appearance" | "store" | "profile" | "security">("appearance");

  // State Appearance Settings
  const fontFamily = useSyncExternalStore(subscribeAppearance, getSavedFont, () => "dn-rounded");
  const fontSize = useSyncExternalStore(subscribeAppearance, getSavedFontSize, () => "medium");
  const [saveMessage, setSaveMessage] = useState("");

  // State Store Info
  const [storeName, setStoreName] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [loadingStore, setLoadingStore] = useState<boolean>(false);

  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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
    if (["dn-rounded", "inter", "system"].includes(font)) root.classList.add(`font-${font}`);
    if (["small", "medium", "large"].includes(size)) root.classList.add(`font-size-${size}`);
  };

  useEffect(() => {
    // Ambil preferensi tampilan
    applyThemeSettings(getSavedFont(), getSavedFontSize());

    const businessId = getBusinessId();
    void Promise.all([
      fetchApi("/auth/me") as Promise<UserProfile>,
      businessId === null
        ? Promise.resolve(null)
        : fetchApi(`/businesses/${businessId}`) as Promise<BusinessProfile>,
    ]).then(([profile, business]) => {
      setFullName(profile.full_name);
      setEmail(profile.email);
      setRole(profile.role);
      setProfileImageUrl(profile.profile_image_url);
      if (business) {
        setStoreName(business.name);
        setCategory(business.category);
        setLocation(business.location);
      } else {
        setDataError("Sesi bisnis tidak ditemukan. Informasi toko tidak tersedia.");
      }
    }).catch((error: unknown) => {
      setDataError(error instanceof Error ? error.message : "Gagal memuat data akun dan bisnis.");
    }).finally(() => setLoadingData(false));
  }, []);

  const persistAppearance = (font: string, size: string) => {
    localStorage.setItem("app_font_family", font);
    localStorage.setItem("app_font_size", size);
    applyThemeSettings(font, size);
    window.dispatchEvent(new Event("smartpos:appearance-updated"));
    setSaveMessage("Preferensi tampilan tersimpan di perangkat ini.");
    setDataError("");
  };

  const handleFontFamilyChange = (font: string) => {
    localStorage.setItem("app_font_family", font);
    applyThemeSettings(font, fontSize);
    window.dispatchEvent(new Event("smartpos:appearance-updated"));
    setSaveMessage("Preferensi tampilan tersimpan di perangkat ini.");
  };

  const handleFontSizeChange = (size: string) => {
    localStorage.setItem("app_font_size", size);
    applyThemeSettings(fontFamily, size);
    window.dispatchEvent(new Event("smartpos:appearance-updated"));
    setSaveMessage("Preferensi tampilan tersimpan di perangkat ini.");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);
    setDataError("");
    setSaveMessage("");
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
      setSaveMessage("Profil akun berhasil diperbarui.");
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
    setSaveMessage("");
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
      setSaveMessage("Informasi toko berhasil diperbarui.");
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
    setSaveMessage("");
    try {
      await fetchApi("/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaveMessage("Kata sandi berhasil diubah.");
    } catch (error) {
      setSecurityError(error instanceof Error ? error.message : "Gagal mengubah kata sandi.");
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDataError("");
    setSaveMessage("");
    if (!file.type.startsWith("image/")) {
      setDataError("Pilih file gambar untuk foto profil.");
      e.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setDataError("Ukuran foto maksimal 2 MB.");
      e.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setUploadingAvatar(true);
    try {
      const profile = await fetchApi("/auth/me/avatar", {
        method: "POST",
        body: formData,
      }) as UserProfile;
      setProfileImageUrl(profile.profile_image_url);
      setFullName(profile.full_name);
      setEmail(profile.email);
      setRole(profile.role);
      setAvatarFailed(false);
      window.dispatchEvent(new Event("smartpos:session-updated"));
      setSaveMessage("Foto profil berhasil diperbarui.");
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Gagal mengunggah foto profil.");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  return (
    <div className="text-slate-900 dark:text-slate-100">
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

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800" role="tablist" aria-label="Kategori pengaturan">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "appearance"}
          onClick={() => setActiveTab("appearance")}
          className={`flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
            activeTab === "appearance"
              ? "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
              : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
          }`}
        >
          <Palette className="h-4 w-4" />
          Tampilan UI
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "profile"}
          onClick={() => setActiveTab("profile")}
          className={`flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
            activeTab === "profile"
              ? "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
              : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
          }`}
        >
          <User className="h-4 w-4" />
          Profil Akun
        </button>

        {isOwner ? (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "store"}
            onClick={() => setActiveTab("store")}
            className={`flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
              activeTab === "store"
                ? "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
            }`}
          >
            <Store className="h-4 w-4" />
            Profil Toko
          </button>
        ) : null}

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "security"}
          onClick={() => setActiveTab("security")}
          className={`flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
            activeTab === "security"
              ? "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
              : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Keamanan
        </button>
      </div>

      {saveMessage && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          {saveMessage}
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
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Jenis huruf">
              <button
                type="button"
                role="radio"
                aria-checked={fontFamily === "dn-rounded"}
                onClick={() => handleFontFamilyChange("dn-rounded")}
                className={`w-full cursor-pointer rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                  fontFamily === "dn-rounded"
                    ? "border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20 dark:bg-teal-500/10"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                }`}
              >
                <p className="text-sm font-bold text-slate-900 dark:text-white">DN Rounded</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Huruf membulat dan ramah dibaca</p>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={fontFamily === "inter"}
                onClick={() => handleFontFamilyChange("inter")}
                className={`w-full cursor-pointer rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                  fontFamily === "inter"
                    ? "border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20 dark:bg-teal-500/10"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                }`}
              >
                <p className="text-sm font-bold text-slate-900 dark:text-white">Inter Sans</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Modern & bersih</p>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={fontFamily === "system"}
                onClick={() => handleFontFamilyChange("system")}
                className={`w-full cursor-pointer rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                  fontFamily === "system"
                    ? "border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20 dark:bg-teal-500/10"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                }`}
              >
                <p className="text-sm font-bold text-slate-900 dark:text-white">System Default</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Bawaan OS</p>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Ukuran Teks UI</h2>
            <div className="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Ukuran teks antarmuka">
              {["small", "medium", "large"].map((size) => (
                <button
                  key={size}
                  type="button"
                  role="radio"
                  aria-checked={fontSize === size}
                  onClick={() => handleFontSizeChange(size)}
                  className={`min-h-11 capitalize rounded-xl border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
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
            onClick={() => persistAppearance(fontFamily, fontSize)}
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
            <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-600 text-lg font-bold text-white">
                {profileImageUrl && !avatarFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profileImageUrl}
                    alt={`Foto profil ${fullName}`}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?"
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{fullName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                  <BadgeCheck className="h-3.5 w-3.5 text-teal-600" />
                  Role: <span className="font-semibold uppercase text-teal-600">{role}</span>
                </p>
                <input
                  id="profile-photo"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar || loadingData}
                  className="sr-only"
                  aria-label="Pilih foto profil"
                />
                <label
                  htmlFor="profile-photo"
                  className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus-within:ring-2 focus-within:ring-teal-600 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {uploadingAvatar ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  {uploadingAvatar ? "Mengunggah foto..." : "Ubah foto"}
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="profile-full-name" className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <User className="h-3.5 w-3.5" /> Nama Lengkap Sesi Ini
              </label>
              <input
                id="profile-full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                required
              />
            </div>

            <div>
              <label htmlFor="profile-email" className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Mail className="h-3.5 w-3.5" /> Email Akun
              </label>
              <input
                id="profile-email"
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
            disabled={loadingProfile || uploadingAvatar || loadingData}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-50 cursor-pointer"
          >
            {loadingProfile ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Profil Akun
          </button>
        </form>
      )}

      {/* TAB 3: PROFIL TOKO */}
      {isOwner && activeTab === "store" && (
        <form onSubmit={handleSaveStoreInfo} className="mt-6 max-w-2xl space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div>
              <label htmlFor="business-name" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Usaha / Toko</label>
              <input
                id="business-name"
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                required
              />
            </div>
            <div>
              <label htmlFor="business-location" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Alamat Toko</label>
              <textarea
                id="business-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="business-category" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Kategori Usaha</label>
              <input
                id="business-category"
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
            disabled={loadingStore || loadingData}
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
            <label htmlFor="current-password" className="sr-only">Kata sandi saat ini</label>
            <input
              id="current-password"
              type="password"
              placeholder="Password Saat Ini"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
            <label htmlFor="new-password" className="sr-only">Kata sandi baru</label>
            <input
              id="new-password"
              type="password"
              placeholder="Password Baru"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>
          <label htmlFor="confirm-password" className="sr-only">Konfirmasi kata sandi baru</label>
          <input
            id="confirm-password"
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