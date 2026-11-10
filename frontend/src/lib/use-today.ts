"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function useTodayLabel() {
  return useSyncExternalStore(
    subscribe,
    () =>
      new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    () => "Hari ini"
  );
}

export function useTodayISO() {
  return useSyncExternalStore(
    subscribe,
    () =>
      new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    () => ""
  );
}
