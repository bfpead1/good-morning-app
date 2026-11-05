import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { db } from "../db/index.js";
import {
  CanvasError,
  canvasConnection,
  fetchMissing,
  fetchSelf,
  fetchUpcoming,
  normalizeBaseUrl,
} from "../lib/canvas.js";
import { requireUser } from "../lib/requireUser.js";
import { encryptSecret } from "../lib/secrets.js";
import { localDate, localDayRange } from "../lib/time.js";

export const canvasRouter = Router();
canvasRouter.use(requireUser);

function sendCanvasError(res, err) {
  if (!(err instanceof CanvasError)) throw err;
  const status = {
    canvas_not_connected: 404,
    canvas_bad_url: 400,
    canvas_auth_failed: 401,
    canvas_unavailable: 502,
  }[err.code];
  res.status(status).json({ error: err.code, message: err.message });
}

/** Connection status. Never includes the token. */
canvasRouter.get("/status", async (req, res) => {
  const row = await db.integrations.get(req.user.id, "canvas");
  res.json(
    row
      ? { connected: true, baseUrl: row.baseUrl, accountName: row.accountName, connectedAt: row.connectedAt }
      : { connected: false },
  );
});

const ConnectSchema = z.object({
  baseUrl: z.string().min(3).max(200),
  token: z.string().trim().min(20).max(200),
});

/** Verifies the token against Canvas, then stores it encrypted. */
canvasRouter.post("/connect", async (req, res) => {
  const body = ConnectSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "invalid_request", message: "Enter your Canvas address and access token." });
  try {
    const conn = { baseUrl: normalizeBaseUrl(body.data.baseUrl), token: body.data.token };
    const self = await fetchSelf(conn);
    await db.integrations.set(req.user.id, "canvas", {
      baseUrl: conn.baseUrl,
      encryptedToken: encryptSecret(conn.token),
      accountName: self.name,
    });
    res.json({ connected: true, baseUrl: conn.baseUrl, accountName: self.name });
  } catch (err) {
    sendCanvasError(res, err);
  }
});

canvasRouter.delete("/connect", async (req, res) => {
  await db.integrations.remove(req.user.id, "canvas");
  res.status(204).end();
});

/** Coursework due from the start of today through the next `days` days, plus recent missing work. */
canvasRouter.get("/upcoming", async (req, res) => {
  const days = z.coerce.number().int().min(1).max(30).catch(7).parse(req.query.days);
  try {
    const conn = await canvasConnection(req.user.id);
    const today = localDate(new Date(), config.timeZone);
    const start = localDayRange(today, config.timeZone).start;
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    const [upcoming, missing] = await Promise.all([fetchUpcoming(conn, { start, end }), fetchMissing(conn)]);
    res.json({ upcoming, missing });
  } catch (err) {
    sendCanvasError(res, err);
  }
});
