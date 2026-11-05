// Read-only Canvas LMS client using a personal access token.
// Only GET requests are ever made; the app never submits or changes anything in Canvas.
import { isIP } from "node:net";
import { db } from "../db/index.js";
import { decryptSecret } from "./secrets.js";

export class CanvasError extends Error {
  /** code: canvas_not_connected | canvas_auth_failed | canvas_bad_url | canvas_unavailable */
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * "school.instructure.com" or "https://school.instructure.com/courses/1" -> "https://school.instructure.com".
 * Rejects non-https, IP addresses, and local hostnames so the server only talks to real Canvas sites.
 */
export function normalizeBaseUrl(input) {
  const raw = input.trim();
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new CanvasError("canvas_bad_url", "That doesn't look like a web address.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (url.protocol !== "https:") throw new CanvasError("canvas_bad_url", "Canvas addresses must use https.");
  if (isIP(host) || !host.includes(".") || /(^|\.)(localhost|local|internal)$/i.test(host)) {
    throw new CanvasError("canvas_bad_url", "Use your school's public Canvas address.");
  }
  return url.origin;
}

async function canvasGet(conn, path, params = {}) {
  const url = new URL(`/api/v1${path}`, conn.baseUrl);
  for (const [key, value] of Object.entries(params)) {
    for (const v of [value].flat()) url.searchParams.append(key, v);
  }

  let res;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${conn.token}`, Accept: "application/json" },
      // Never forward the token to wherever a redirect points.
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    throw new CanvasError("canvas_unavailable", `Couldn't reach Canvas: ${err.message}`);
  }

  if (res.status === 401) throw new CanvasError("canvas_auth_failed", "Canvas rejected the access token.");
  if (res.status >= 300 && res.status < 400) {
    throw new CanvasError("canvas_bad_url", "Canvas redirected; use the exact address you see in your browser when logged in.");
  }
  if (!res.ok) throw new CanvasError("canvas_unavailable", `Canvas returned HTTP ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("json")) throw new CanvasError("canvas_bad_url", "That address doesn't look like a Canvas site.");
  return res.json();
}

/** The user's Canvas connection with a decrypted token, or throws canvas_not_connected. */
export async function canvasConnection(userId) {
  const row = await db.integrations.get(userId, "canvas");
  if (!row) throw new CanvasError("canvas_not_connected", "Canvas isn't connected.");
  const token = decryptSecret(row.encryptedToken);
  if (!token) throw new CanvasError("canvas_auth_failed", "Reconnect Canvas (the saved token can't be read).");
  return { baseUrl: row.baseUrl, token, accountName: row.accountName };
}

/** Verifies a token by fetching the user's own profile. */
export async function fetchSelf(conn) {
  const self = await canvasGet(conn, "/users/self");
  if (!self?.id) throw new CanvasError("canvas_bad_url", "That address doesn't look like a Canvas site.");
  return { id: self.id, name: self.name ?? self.short_name ?? "Canvas user" };
}

const WORK_TYPES = new Set(["assignment", "quiz", "discussion_topic", "sub_assignment"]);

/** Assignments, quizzes, and discussions due between start and end (Canvas planner). */
export async function fetchUpcoming(conn, { start, end }) {
  const items = await canvasGet(conn, "/planner/items", {
    start_date: start.toISOString(),
    end_date: end.toISOString(),
    per_page: "100",
  });
  return items
    .filter((i) => WORK_TYPES.has(i.plannable_type))
    .map((i) => {
      const sub = i.submissions || {};
      return {
        id: `${i.plannable_type}-${i.plannable_id}`,
        title: i.plannable?.title ?? "Untitled",
        course: i.context_name ?? null,
        type: i.plannable_type,
        dueAt: i.plannable?.due_at ?? i.plannable_date ?? null,
        points: i.plannable?.points_possible ?? null,
        url: i.html_url ? new URL(i.html_url, conn.baseUrl).href : null,
        submitted: Boolean(sub.submitted),
        graded: Boolean(sub.graded),
        late: Boolean(sub.late),
        missing: Boolean(sub.missing),
        done: Boolean(sub.submitted || sub.excused || i.planner_override?.marked_complete),
      };
    })
    .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));
}

/** Past-due work Canvas marks as missing, limited to the last `days` days. */
export async function fetchMissing(conn, { days = 21 } = {}) {
  const items = await canvasGet(conn, "/users/self/missing_submissions", {
    "filter[]": ["submittable"],
    "include[]": ["course"],
    per_page: "50",
  });
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return items
    .filter((a) => a.due_at && new Date(a.due_at).getTime() >= cutoff)
    .map((a) => ({
      id: `assignment-${a.id}`,
      title: a.name ?? "Untitled",
      course: a.course?.name ?? null,
      dueAt: a.due_at,
      points: a.points_possible ?? null,
      url: a.html_url ?? null,
    }))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}
