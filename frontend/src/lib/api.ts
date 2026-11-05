export class ApiError extends Error {
  status: number;
  code: string | undefined;
  /** Seconds to wait, when the server reports a rate limit. */
  retryAfter: number | null;
  constructor(status: number, code: string | undefined, message?: string, retryAfter: number | null = null) {
    super(message ?? code ?? `Request failed (${status})`);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error, body.message, body.retryAfter ?? null);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export async function getJson<T>(url: string): Promise<T> {
  return handle<T>(await fetch(url, { credentials: "same-origin" }));
}

export async function sendJson<T>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  return handle<T>(
    await fetch(url, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

/** YYYY-MM-DD in the browser's local timezone. */
export function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
