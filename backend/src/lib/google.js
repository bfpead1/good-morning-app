import { OAuth2Client } from "google-auth-library";
import { config } from "../config.js";
import { db } from "../db/index.js";

export const SCOPES = {
  gmail: "https://www.googleapis.com/auth/gmail.readonly",
  // View and edit events (no access to calendar settings or sharing).
  calendarEvents: "https://www.googleapis.com/auth/calendar.events",
  // Read-only; granted by accounts that signed in before editing was added.
  calendarReadonly: "https://www.googleapis.com/auth/calendar.readonly",
};

const LOGIN_SCOPES = ["openid", "email", "profile", SCOPES.gmail, SCOPES.calendarEvents];

export function createOAuthClient() {
  return new OAuth2Client({
    clientId: config.google.clientId,
    clientSecret: config.google.clientSecret,
    redirectUri: config.google.redirectUri,
  });
}

export function buildAuthUrl({ state, forceConsent }) {
  return createOAuthClient().generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    scope: LOGIN_SCOPES,
    state,
    // Google only issues a refresh token on a consent screen, so force one when we're missing it.
    prompt: forceConsent ? "consent select_account" : "select_account",
  });
}

/** Which of the Google APIs the user actually granted (they can untick boxes on the consent screen). */
export function connectionsFromScope(scope = "") {
  const granted = new Set(scope.split(" "));
  return {
    gmail: granted.has(SCOPES.gmail),
    calendar: granted.has(SCOPES.calendarEvents) || granted.has(SCOPES.calendarReadonly),
    calendarEdit: granted.has(SCOPES.calendarEvents),
  };
}

/** An OAuth client for a stored user that persists refreshed access tokens automatically. */
export function clientForUser(user) {
  const client = createOAuthClient();
  client.setCredentials(user.tokens);
  client.on("tokens", (tokens) => {
    db.users.updateTokens(user.id, tokens).catch((err) =>
      console.error("Failed to persist refreshed Google tokens", err),
    );
  });
  return client;
}

/** True when Google says the stored grant is no longer usable (revoked, expired, or password changed). */
export function isReauthError(err) {
  return err?.response?.data?.error === "invalid_grant" || err?.status === 401;
}
