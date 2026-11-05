import { db } from "../db/index.js";

/** Loads the signed-in user onto req.user, or responds 401. */
export async function requireUser(req, res, next) {
  const user = req.session.userId ? await db.users.get(req.session.userId) : null;
  if (!user) return res.status(401).json({ error: "Not signed in" });
  req.user = user;
  next();
}
