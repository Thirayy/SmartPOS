const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace(/\/+$/, "");

export function getBusinessId(): number | null {
  if (typeof window === "undefined") return null;

  const businessId = Number(window.localStorage.getItem("smartpos_business_id"));
  return Number.isSafeInteger(businessId) && businessId > 0 ? businessId : null;
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const baseUrl = new URL(API_BASE_URL);
  const basePath = baseUrl.pathname.replace(/\/+$/, "");
  const endpointUrl = new URL(endpoint, "http://smartpos.local");
  let endpointPath = endpointUrl.pathname;

  if (basePath && (endpointPath === basePath || endpointPath.startsWith(`${basePath}/`))) {
    endpointPath = endpointPath.slice(basePath.length);
  }

  const requestUrl = new URL(`${endpointPath.replace(/^\/+/, "")}${endpointUrl.search}${endpointUrl.hash}`, `${API_BASE_URL}/`);
  const token = typeof window === "undefined" ? null : window.localStorage.getItem("smartpos_access_token");
  const res = await fetch(requestUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Terjadi kesalahan pada server" }));
    throw new Error(errorData.detail || "Gagal melakukan request API");
  }

  return res.json();
}