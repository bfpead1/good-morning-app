import { randomBytes } from "node:crypto";
import { Router } from "express";
import { config } from "../config.js";
import {
  buildAuthUrl,
  connectionsFromScope,
  createOAuthClient,
} from "../lib/google.js";
import { db } from "../db/index.js";

export const authRouter = Router();

function loginRedirect(res, error) {
  res.redirect(`${config.frontendUrl}/login?error=${encodeURIComponent(error)}`);
}

authRouter.get("/google", (req, res) => {
  const state = randomBytes(24).toString("hex");
  req.session.oauthState = state;
  res.redirect(buildAuthUrl({ state, forceConsent: req.query.consent === "1" }));
});

authRouter.get("/google/callback", async (req, res) => {
  const { code, state, error } = req.query;
  const expectedState = req.session.oauthState;
  delete req.session.oauthState;

  if (error) return loginRedirect(res, error === "access_denied" ? "access_denied" : "google_error");
  if (!code || !state || state !== expectedState) return loginRedirect(res, "invalid_state");

  let user;
  try {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: config.google.clientId,
    });
    const profile = ticket.getPayload();

    if (config.allowedEmails && !config.allowedEmails.includes(profile.email?.toLowerCase())) {
      console.warn(`Sign-in rejected: ${profile.email} is not in ALLOWED_EMAILS`);
      return loginRedirect(res, "not_allowed");
    }

    user = await db.users.upsert(profile.sub, {
      email: profile.email,
      name: profile.name ?? profile.email,
      picture: profile.picture ?? null,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        scope: tokens.scope,
        token_type: tokens.token_type,
      },
    });
  } catch (err) {
    // Google's token endpoint explains failures (bad secret, reused code, ...) in the response body.
    console.error(
      "Google sign-in callback failed:",
      err?.response?.data ?? err?.message ?? err,
    );
    if (!err?.response) console.error(err);
    return loginRedirect(res, "google_error");
  }

  // Without a refresh token we lose Gmail/Calendar access as soon as the access token
  // expires (~1 hour). This happens when the user granted access before but we have no
  // stored token, so send them back through the consent screen once to get one.
  if (!user.tokens.refresh_token) {
    return res.redirect("/api/auth/google?consent=1");
  }

  req.session.userId = user.id;
  res.redirect(`${config.frontendUrl}/`);
});

authRouter.get("/me", async (req, res) => {
  const user = req.session.userId ? await db.users.get(req.session.userId) : null;
  if (!user) return res.status(401).json({ error: "Not signed in" });

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    connections: connectionsFromScope(user.tokens.scope),
  });
});

authRouter.post("/logout", (req, res) => {
  req.session = null;
  res.status(204).end();
});

/** Revokes the app's Google access entirely and forgets the user. */
authRouter.post("/disconnect", async (req, res) => {
  const user = req.session.userId ? await db.users.get(req.session.userId) : null;
  if (user) {
    const token = user.tokens.refresh_token ?? user.tokens.access_token;
    try {
      await createOAuthClient().revokeToken(token);
    } catch (err) {
      // Already revoked on Google's side is fine; we still forget the user locally.
      console.warn("Google token revoke failed", err?.response?.data ?? err.message);
    }
    await db.users.delete(user.id);
  }
  req.session = null;
  res.status(204).end();
});
