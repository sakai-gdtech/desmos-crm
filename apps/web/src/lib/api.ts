export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
let refreshing: Promise<boolean> | null = null;
let expectedTenant: string | undefined;
let tabId: string | undefined;
export function sessionTabId() {
  return (tabId ??= crypto.randomUUID());
}
export function setExpectedTenant(tenantId: string | undefined) {
  expectedTenant = tenantId;
}
export function notifySessionChange(kind: "changed" | "logout") {
  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel("orbit-session");
    channel.postMessage({ kind, senderId: sessionTabId() });
    channel.close();
  }
}
async function rotateRefresh() {
  // Another tab may already have rotated the shared cookies while this tab waited.
  const existing = await fetch("/api/me", {
    credentials: "include",
    cache: "no-store",
  });
  if (existing.ok) return true;
  return (
    await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
  ).ok;
}
async function refresh() {
  if (!refreshing) {
    refreshing = Promise.resolve(
      "locks" in navigator
        ? navigator.locks.request("orbit-session-refresh", rotateRefresh)
        : rotateRefresh(),
    )
      .then((value) => value)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> {
  const mutation =
    !!options.method && !["GET", "HEAD"].includes(options.method);
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  if (
    mutation &&
    !path.startsWith("/auth/") &&
    expectedTenant &&
    !headers.has("X-Expected-Tenant-Id")
  )
    headers.set("X-Expected-Tenant-Id", expectedTenant);
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    cache: "no-store",
    headers,
  }).catch(() => {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.",
    );
  });
  if (response.status === 401 && !path.startsWith("/auth/") && !retried) {
    if (await refresh()) return api<T>(path, { ...options, headers }, true);
  }
  const body =
    response.status === 204
      ? undefined
      : await response.json().catch(() => undefined);
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth/"))
      window.dispatchEvent(new Event("orbit:unauthorized"));
    throw new ApiError(
      response.status,
      body?.error?.code ?? "REQUEST_FAILED",
      body?.error?.message ?? "Não foi possível concluir. Tente novamente.",
    );
  }
  return body as T;
}
export const post = <T = unknown>(path: string, body: unknown = {}) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body) });
export const patch = <T = unknown>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Ocorreu um erro inesperado. Tente novamente.";
}
