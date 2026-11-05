// Local JSON-file implementation of the data store, used until Supabase is configured.
// Mirrors supabaseStore.js method-for-method; see db/index.js for the interface.
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { mergeTokens } from "./tokens.js";

const DATA_DIR = path.resolve(import.meta.dirname, "../../data");
const DB_FILE = path.join(DATA_DIR, "db.json");
// Users were stored here before the rest of the app had a database.
const LEGACY_USERS_FILE = path.join(DATA_DIR, "users.json");

const EMPTY = {
  users: {},
  settings: {},
  bodyMetrics: {},
  scripture: {},
  workoutPlans: {},
  suggestions: {},
  briefs: {},
  workoutLogs: {},
  integrations: {},
};

let cache = null;
let writeQueue = Promise.resolve();

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

async function load() {
  if (cache) return cache;
  const stored = await readJson(DB_FILE);
  cache = { ...structuredClone(EMPTY), ...stored };
  if (!stored) {
    const legacyUsers = await readJson(LEGACY_USERS_FILE);
    if (legacyUsers) cache.users = legacyUsers;
  }
  return cache;
}

function persist() {
  writeQueue = writeQueue.then(async () => {
    await mkdir(DATA_DIR, { recursive: true });
    const tmp = `${DB_FILE}.tmp`;
    await writeFile(tmp, JSON.stringify(cache, null, 2));
    await rename(tmp, DB_FILE);
  });
  return writeQueue;
}

const now = () => new Date().toISOString();

/** Returns (creating if needed) a per-user bucket inside a collection. */
function bucket(db, collection, userId, initial) {
  db[collection][userId] ??= initial;
  return db[collection][userId];
}

export const jsonStore = {
  kind: "json",

  users: {
    async listIds() {
      return Object.keys((await load()).users);
    },
    async get(id) {
      return (await load()).users[id] ?? null;
    },
    async upsert(id, { tokens, ...fields }) {
      const db = await load();
      const existing = db.users[id];
      db.users[id] = {
        ...existing,
        ...fields,
        id,
        tokens: mergeTokens(existing?.tokens, tokens),
        createdAt: existing?.createdAt ?? now(),
        updatedAt: now(),
      };
      await persist();
      return db.users[id];
    },
    async updateTokens(id, tokens) {
      const db = await load();
      if (!db.users[id]) return;
      db.users[id].tokens = mergeTokens(db.users[id].tokens, tokens);
      db.users[id].updatedAt = now();
      await persist();
    },
    async delete(id) {
      const db = await load();
      for (const collection of Object.keys(EMPTY)) delete db[collection][id];
      await persist();
    },
  },

  settings: {
    async get(userId) {
      return (await load()).settings[userId] ?? {};
    },
    async update(userId, patch) {
      const db = await load();
      db.settings[userId] = { ...db.settings[userId], ...patch };
      await persist();
      return db.settings[userId];
    },
  },

  bodyMetrics: {
    async list(userId) {
      const entries = (await load()).bodyMetrics[userId] ?? [];
      return [...entries].sort(
        (a, b) => b.measuredOn.localeCompare(a.measuredOn) || b.createdAt.localeCompare(a.createdAt),
      );
    },
    async add(userId, entry) {
      const db = await load();
      const row = { ...entry, id: randomUUID(), createdAt: now() };
      bucket(db, "bodyMetrics", userId, []).push(row);
      await persist();
      return row;
    },
    async remove(userId, id) {
      const db = await load();
      db.bodyMetrics[userId] = (db.bodyMetrics[userId] ?? []).filter((e) => e.id !== id);
      await persist();
    },
  },

  scripture: {
    /** { [bookSlug]: { [chapter]: { completed, completedVia, completedAt } } } */
    async getProgress(userId) {
      return (await load()).scripture[userId] ?? {};
    },
    async setChapters(userId, records) {
      const db = await load();
      const progress = bucket(db, "scripture", userId, {});
      for (const { slug, chapter, completed, completedVia, completedAt } of records) {
        progress[slug] ??= {};
        if (completed) {
          progress[slug][chapter] = { completed: true, completedVia, completedAt };
        } else {
          delete progress[slug][chapter];
        }
      }
      await persist();
    },
  },

  workoutPlans: {
    async getActive(userId) {
      return (await load()).workoutPlans[userId] ?? null;
    },
    async setActive(userId, { plan, source, summary }) {
      const db = await load();
      db.workoutPlans[userId] = { id: randomUUID(), plan, source, summary, createdAt: now() };
      await persist();
      return db.workoutPlans[userId];
    },
    async clearActive(userId) {
      const db = await load();
      delete db.workoutPlans[userId];
      await persist();
    },
  },

  suggestions: {
    async create(userId, suggestion) {
      const db = await load();
      const row = { ...suggestion, id: randomUUID(), status: "pending", createdAt: now() };
      bucket(db, "suggestions", userId, []).push(row);
      await persist();
      return row;
    },
    async get(userId, id) {
      return ((await load()).suggestions[userId] ?? []).find((s) => s.id === id) ?? null;
    },
    async latestPending(userId) {
      const rows = (await load()).suggestions[userId] ?? [];
      return rows.filter((s) => s.status === "pending").at(-1) ?? null;
    },
    async setStatus(userId, id, status) {
      const db = await load();
      const row = (db.suggestions[userId] ?? []).find((s) => s.id === id);
      if (!row) return;
      row.status = status;
      row.resolvedAt = now();
      await persist();
    },
  },

  integrations: {
    async get(userId, provider) {
      return (await load()).integrations[userId]?.[provider] ?? null;
    },
    async set(userId, provider, { baseUrl, encryptedToken, accountName }) {
      const db = await load();
      const row = { baseUrl, encryptedToken, accountName, connectedAt: now() };
      bucket(db, "integrations", userId, {})[provider] = row;
      await persist();
      return row;
    },
    async remove(userId, provider) {
      const db = await load();
      if (db.integrations[userId]) delete db.integrations[userId][provider];
      await persist();
    },
  },

  workoutLogs: {
    /** Most recent first. */
    async list(userId, { since } = {}) {
      const logs = Object.values((await load()).workoutLogs[userId] ?? {});
      return logs
        .filter((l) => !since || l.date >= since)
        .sort((a, b) => b.date.localeCompare(a.date));
    },
    async upsert(userId, date, { weekLabel, dayTitle, completed, totalItems }) {
      const db = await load();
      const row = { date, weekLabel, dayTitle, completed, totalItems, updatedAt: now() };
      bucket(db, "workoutLogs", userId, {})[date] = row;
      await persist();
      return row;
    },
  },

  briefs: {
    async get(userId, date) {
      return (await load()).briefs[userId]?.[date] ?? null;
    },
    async save(userId, date, brief) {
      const db = await load();
      const row = { brief, createdAt: now(), acceptedAt: null };
      bucket(db, "briefs", userId, {})[date] = row;
      await persist();
      return row;
    },
    async markAccepted(userId, date) {
      const db = await load();
      const row = db.briefs[userId]?.[date];
      if (!row) return;
      row.acceptedAt = now();
      await persist();
    },
  },
};
