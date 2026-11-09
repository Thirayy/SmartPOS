"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Mail, Plus, Shield, UserCog, UserX, Users } from "lucide-react";
import { fetchApi, getBusinessId } from "@/lib/api";
import { isOwnerRole, roleLabel, useSessionRole } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { cn } from "@/lib/utils";

interface Member {
  id: number;
  user_id: number;
  business_id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const assignableRoles = [
  { value: "CASHIER", label: "Kasir", description: "Transaksi kasir dan shift sendiri" },
  { value: "MANAGER", label: "Manajer", description: "Kelola produk, laporan, dan anggota" },
  { value: "OWNER", label: "Owner", description: "Akses penuh termasuk anggota tim" },
];

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Terjadi kesalahan saat memproses anggota.";

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:bg-slate-950";

const labelClass =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500";

function MembersSkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function MembersPage() {
  const businessId = getBusinessId();
  const sessionRole = useSessionRole();
  const canManage = isOwnerRole(sessionRole);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("CASHIER");
  const [editing, setEditing] = useState<Member | null>(null);
  const [editRole, setEditRole] = useState("CASHIER");
  const [editActive, setEditActive] = useState(true);
  const [deactivating, setDeactivating] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (businessId === null) {
        throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
      }
      const data = await fetchApi(`/businesses/${businessId}/members/`);
      setMembers(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void (async () => {
      await loadMembers();
    })();
  }, [loadMembers]);

  const openCreate = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setRole("CASHIER");
    setActionError("");
    setSuccessMessage("");
    setCreateOpen(true);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionError("");
    setSuccessMessage("");
    setSaving(true);

    try {
      if (businessId === null) {
        throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
      }
      await fetchApi(`/businesses/${businessId}/members/`, {
        method: "POST",
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          role,
        }),
      });
      setCreateOpen(false);
      setSuccessMessage("Anggota baru berhasil ditambahkan.");
      await loadMembers();
    } catch (createError) {
      setActionError(getErrorMessage(createError));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (member: Member) => {
    setEditing(member);
    setEditRole(member.role);
    setEditActive(member.is_active);
    setActionError("");
    setSuccessMessage("");
  };

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;

    setActionError("");
    setSuccessMessage("");
    setSaving(true);

    try {
      if (businessId === null) {
        throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
      }
      await fetchApi(`/businesses/${businessId}/members/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: editRole, is_active: editActive }),
      });
      setEditing(null);
      setSuccessMessage("Data anggota berhasil diperbarui.");
      await loadMembers();
    } catch (updateError) {
      setActionError(getErrorMessage(updateError));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivating) return;

    setActionError("");
    setSuccessMessage("");
    setSaving(true);

    try {
      if (businessId === null) {
        throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
      }
      await fetchApi(`/businesses/${businessId}/members/${deactivating.id}`, {
        method: "DELETE",
      });
      setDeactivating(null);
      setSuccessMessage("Anggota dinonaktifkan.");
      await loadMembers();
    } catch (deactivateError) {
      setActionError(getErrorMessage(deactivateError));
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
            Tim
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Anggota tim
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola akses owner, manajer, dan kasir untuk bisnis ini.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone="slate">
            <Users className="h-3 w-3" />
            {members.length} anggota
          </Badge>
          {canManage ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Tambah anggota
            </Button>
          ) : null}
        </div>
      </div>

      {successMessage ? (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {successMessage}
        </div>
      ) : null}

      <Card className="min-w-0 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Daftar anggota</h2>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {loading ? "Memuat anggota..." : "Perubahan peran langsung berlaku saat anggota login berikutnya."}
            </p>
          </div>
          {!canManage && sessionRole ? (
            <Badge tone="amber">
              <Shield className="h-3 w-3" />
              Hanya baca
            </Badge>
          ) : null}
        </div>

        <div className="mt-4">
          {loading ? (
            <MembersSkeleton />
          ) : error ? (
            <ErrorState title="Anggota gagal dimuat" message={error} onRetry={() => void loadMembers()} />
          ) : members.length === 0 ? (
            <EmptyState
              compact
              icon={Users}
              title="Belum ada anggota"
              description="Tambahkan kasir atau manajer untuk membantu operasional toko."
              action={
                canManage ? (
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="h-3.5 w-3.5" />
                    Tambah anggota
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-2.5">
              {members.map((member) => {
                const isOwner = member.role === "OWNER";
                const tone = member.role === "OWNER" ? "teal" : member.role === "MANAGER" ? "sky" : "slate";

                return (
                  <div
                    key={member.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-800/30"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold",
                          member.is_active
                            ? "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
                            : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                        )}
                      >
                        {member.full_name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?"}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {member.full_name}
                          </p>
                          <Badge tone={tone}>{roleLabel(member.role)}</Badge>
                          {!member.is_active ? <Badge tone="rose">Nonaktif</Badge> : null}
                        </div>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
                          <Mail className="h-3 w-3 shrink-0" />
                          {member.email}
                        </p>
                      </div>
                    </div>

                    {canManage && !isOwner ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(member)}>
                          <UserCog className="h-3.5 w-3.5" />
                          Ubah
                        </Button>
                        {member.is_active ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setDeactivating(member);
                              setActionError("");
                            }}
                            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            Nonaktifkan
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => openEdit(member)}>
                            Aktifkan
                          </Button>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        title="Tambah anggota"
        description="Anggota baru bisa langsung login memakai email dan kata sandi ini."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" form="member-create-form" loading={saving}>
              Simpan anggota
            </Button>
          </>
        }
        closeOnBackdrop={!saving}
      >
        <form id="member-create-form" onSubmit={handleCreate} className="space-y-4">
          {actionError ? <ErrorState compact title="Anggota belum bisa disimpan" message={actionError} /> : null}

          <div>
            <label htmlFor="member-name" className={labelClass}>Nama lengkap</label>
            <input
              id="member-name"
              type="text"
              required
              autoFocus
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Contoh: Siti Rahma"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="member-email" className={labelClass}>Email</label>
            <input
              id="member-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@toko.com"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="member-password" className={labelClass}>Kata sandi awal</label>
            <input
              id="member-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimal 8 karakter"
              className={inputClass}
            />
          </div>

          <div>
            <p className={labelClass}>Peran</p>
            <div className="space-y-2">
              {assignableRoles.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setRole(item.value)}
                  aria-pressed={role === item.value}
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition",
                    role === item.value
                      ? "border-teal-500 bg-teal-50 ring-2 ring-teal-500/20 dark:border-teal-500 dark:bg-teal-500/10"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                  )}
                >
                  <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", role === item.value ? "border-teal-600 bg-teal-600 text-white dark:border-teal-400 dark:bg-teal-400 dark:text-slate-950" : "border-slate-300 dark:border-slate-600")}>
                    {role === item.value ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">{item.label}</span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">{item.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => !saving && setEditing(null)}
        title="Ubah anggota"
        description={editing ? `${editing.full_name} · ${editing.email}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" form="member-edit-form" loading={saving}>
              Simpan perubahan
            </Button>
          </>
        }
        closeOnBackdrop={!saving}
      >
        <form id="member-edit-form" onSubmit={handleUpdate} className="space-y-4">
          {actionError ? <ErrorState compact title="Perubahan belum tersimpan" message={actionError} /> : null}

          <div>
            <label htmlFor="member-role" className={labelClass}>Peran</label>
            <select
              id="member-role"
              value={editRole}
              onChange={(event) => setEditRole(event.target.value)}
              className={inputClass}
            >
              {assignableRoles.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <span>
              <span className="block text-sm font-semibold text-slate-900 dark:text-white">Status aktif</span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                Nonaktifkan untuk mencabut akses tanpa menghapus data.
              </span>
            </span>
            <input
              type="checkbox"
              checked={editActive}
              onChange={(event) => setEditActive(event.target.checked)}
              className="h-5 w-5 accent-teal-600"
            />
          </label>
        </form>
      </Modal>

      <Modal
        open={deactivating !== null}
        onClose={() => !saving && setDeactivating(null)}
        title="Nonaktifkan anggota"
        description="Anggota tidak akan bisa mengakses bisnis ini lagi."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeactivating(null)} disabled={saving}>
              Batal
            </Button>
            <Button variant="danger" onClick={() => void handleDeactivate()} loading={saving}>
              Nonaktifkan
            </Button>
          </>
        }
        closeOnBackdrop={!saving}
      >
        {actionError ? <ErrorState compact title="Gagal menonaktifkan" message={actionError} /> : null}
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Nonaktifkan <span className="font-bold">{deactivating?.full_name}</span> ({deactivating?.email})?
        </p>
      </Modal>
    </div>
  );
}
