// Encrypts third-party API tokens (e.g. Canvas) at rest with AES-256-GCM.
// The key is derived from SESSION_SECRET, so changing SESSION_SECRET means
// reconnecting those integrations.
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { config } from "../config.js";

const KEY = Buffer.from(
  hkdfSync("sha256", config.sessionSecret, "good-morning-app", "integration-tokens", 32),
);

/** "v1.<iv>.<tag>.<ciphertext>", all base64url. */
export function encryptSecret(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv, tag, data].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

/** Returns the plaintext, or null if it can't be decrypted (e.g. SESSION_SECRET changed). */
export function decryptSecret(encoded) {
  try {
    const [version, iv, tag, data] = encoded.split(".");
    if (version !== "v1") return null;
    const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
