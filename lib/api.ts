import type { Paginated } from "./types";

export type ErrorMap = {
  form: string[];
  fields: Record<string, string[]>;
};

export class ApiError extends Error {
  status: number;
  errors: ErrorMap;
  code?: string;

  constructor(status: number, errors: ErrorMap, code?: string) {
    const fieldMessage = Object.values(errors.fields).find((messages) => messages.length)?.[0];
    super(errors.form[0] || fieldMessage || "Request failed");
    this.status = status;
    this.errors = errors;
    this.code = code;
  }
}

export const SESSION_EXPIRED_EVENT = "pk:session-expired";

function asMessages(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(asMessages);
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).flatMap(asMessages);
  return [];
}

/** DRF errors -> {form: general messages, fields: per-field messages}. */
export function parseErrors(data: unknown): ErrorMap {
  const result: ErrorMap = { form: [], fields: {} };
  if (Array.isArray(data)) {
    result.form.push(...asMessages(data));
    return result;
  }
  if (!data || typeof data !== "object") {
    result.form.push("Something went wrong.");
    return result;
  }
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (key === "detail" || key === "non_field_errors" || key === "code") {
      if (key !== "code") result.form.push(...asMessages(value));
      continue;
    }
    result.fields[key] = asMessages(value);
  }
  return result;
}

export type ApiResult<T> = { data: T; headers: Headers };

export async function apiRaw<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(`/api${path}`, { ...options, headers, credentials: "same-origin" });
  if (response.status === 204) return { data: undefined as T, headers: response.headers };
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = typeof body?.code === "string" ? body.code : undefined;
    if (response.status === 401 && code === "session_expired" && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }
    throw new ApiError(response.status, parseErrors(body), code);
  }
  return { data: body as T, headers: response.headers };
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  return (await apiRaw<T>(path, options)).data;
}

export const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

/** "http://host/api/employees/?page=2" -> "/employees/?page=2" (next links are absolute). */
function relativeNext(next: string): string {
  const url = new URL(next);
  return `${url.pathname.replace(/^\/api/, "")}${url.search}`;
}

/** Every page of a list endpoint. Lists here are small; this keeps the screens simple. */
export async function fetchAll<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  let next: string | null = path;
  while (next) {
    const page: Paginated<T> = await api<Paginated<T>>(next);
    items.push(...page.results);
    next = page.next ? relativeNext(page.next) : null;
  }
  return items;
}

/** Download a binary/CSV response through the proxy and hand it to the browser as a file. */
export async function download(path: string, filename: string): Promise<void> {
  const response = await fetch(`/api${path}`, { credentials: "same-origin" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 && body?.code === "session_expired") {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }
    throw new ApiError(response.status, parseErrors(body));
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function login(username: string, password: string): Promise<void> {
  const response = await fetch("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
    credentials: "same-origin",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, parseErrors(body));
  }
}

export async function logout(): Promise<void> {
  await fetch("/auth/logout", { method: "POST", credentials: "same-origin" });
}

export async function expireSession(): Promise<void> {
  await fetch("/auth/expire", { method: "POST", credentials: "same-origin" });
}

/** POST the employee CSV. A 400 still carries the per-row errors, so it is returned, not thrown. */
export async function uploadEmployeesCsv(file: File): Promise<import("./types").ImportResult> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/employees/import/", { method: "POST", body: form, credentials: "same-origin" });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 && body?.code === "session_expired") {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }
  if (typeof body?.created === "number" && Array.isArray(body?.errors)) return body;
  throw new ApiError(response.status, parseErrors(body));
}
