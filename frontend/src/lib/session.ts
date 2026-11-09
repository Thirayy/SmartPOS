"use client";

import { useSyncExternalStore } from "react";

export type UserRole = "OWNER" | "MANAGER" | "CASHIER";

const roleLabels: Record<UserRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manajer",
  CASHIER: "Kasir",
};

export function normalizeRole(value: string | null | undefined): UserRole | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  return normalized === "OWNER" || normalized === "MANAGER" || normalized === "CASHIER"
    ? normalized
    : null;
}

export function roleLabel(value: string | null | undefined) {
  const role = normalizeRole(value);
  return role ? roleLabels[role] : "Anggota";
}

export function isManagerRole(value: string | null | undefined) {
  const role = normalizeRole(value);
  return role === "OWNER" || role === "MANAGER";
}

export function isOwnerRole(value: string | null | undefined) {
  return normalizeRole(value) === "OWNER";
}

function readStoredSession(): { role: UserRole | null; userId: number | null } {
  if (typeof window === "undefined") return { role: null, userId: null };

  let role: UserRole | null = null;
  try {
    const raw = window.localStorage.getItem("user_session");
    if (raw) {
      const parsed = JSON.parse(raw) as { role?: string };
      role = normalizeRole(parsed.role);
    }
  } catch {
    role = null;
  }

  role = role ?? normalizeRole(window.localStorage.getItem("smartpos_role"));

  const storedUserId = Number(window.localStorage.getItem("smartpos_user_id"));
  const userId = Number.isSafeInteger(storedUserId) && storedUserId > 0 ? storedUserId : null;

  return { role, userId };
}

export function getSessionRole(): UserRole | null {
  return readStoredSession().role;
}

export function getSessionUserId(): number | null {
  return readStoredSession().userId;
}

function subscribeSession(callback: () => void) {
  window.addEventListener("smartpos:session-updated", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("smartpos:session-updated", callback);
    window.removeEventListener("storage", callback);
  };
}

export function useSessionRole(): UserRole | null {
  return useSyncExternalStore(subscribeSession, getSessionRole, () => null);
}
