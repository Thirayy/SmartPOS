const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace(/\/+$/, "");

export function getBusinessId(): number | null {
  if (typeof window === "undefined") return null;

  const businessId = Number(window.localStorage.getItem("smartpos_business_id"));
  return Number.isSafeInteger(businessId) && businessId > 0 ? businessId : null;
}

function resolveRequestUrl(endpoint: string) {
  const baseUrl = new URL(API_BASE_URL);
  const basePath = baseUrl.pathname.replace(/\/+$/, "");
  const endpointUrl = new URL(endpoint, "http://smartpos.local");
  let endpointPath = endpointUrl.pathname;

  if (basePath && (endpointPath === basePath || endpointPath.startsWith(`${basePath}/`))) {
    endpointPath = endpointPath.slice(basePath.length);
  }

  return new URL(
    `${endpointPath.replace(/^\/+/, "")}${endpointUrl.search}${endpointUrl.hash}`,
    `${API_BASE_URL}/`
  );
}

function buildHeaders(options: RequestInit) {
  const headers = new Headers(options.headers);
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = typeof window === "undefined" ? null : window.localStorage.getItem("smartpos_access_token");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(resolveRequestUrl(endpoint), {
    ...options,
    headers: buildHeaders(options),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Terjadi kesalahan pada server" }));
    throw new Error(errorData.detail || "Gagal melakukan request API");
  }

  return res.json();
}

export type StreamEvent = Record<string, unknown>;

export async function streamApi(
  endpoint: string,
  options: RequestInit,
  onEvent: (event: StreamEvent) => void
) {
  const res = await fetch(resolveRequestUrl(endpoint), {
    ...options,
    headers: buildHeaders(options),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Terjadi kesalahan pada server" }));
    throw new Error(errorData.detail || "Gagal melakukan request API");
  }
  if (!res.body) {
    throw new Error("Browser tidak mendukung respons streaming.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const emitLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      onEvent(JSON.parse(trimmed) as StreamEvent);
    } catch {
      // Abaikan baris yang bukan JSON valid.
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) emitLine(line);
  }

  if (buffer.trim()) emitLine(buffer);
}