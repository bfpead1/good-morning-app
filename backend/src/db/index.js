// The app's single data-access entry point. Routes import `db` from here and never
// know which store is behind it:
//   - Supabase, when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
//   - otherwise a local JSON file at backend/data/db.json (development)
//
// Interface (all methods async):
//   users        listIds() | get(id) | upsert(id, {email, name, picture, tokens}) | updateTokens(id, tokens) | delete(id)
//   settings     get(userId) -> object | update(userId, patch) -> object
//   bodyMetrics  list(userId) | add(userId, {measuredOn, weightLbs, muscleMassLbs, bodyFatPct, note}) | remove(userId, id)
//   scripture    getProgress(userId) | setChapters(userId, [{slug, chapter, completed, completedVia, completedAt}])
//   workoutPlans getActive(userId) | setActive(userId, {plan, source, summary}) | clearActive(userId)
//   suggestions  create(userId, {kind, target, request, summary, changes, plan}) | get(userId, id) | latestPending(userId) | setStatus(userId, id, status)
//   workoutLogs  list(userId, {since?}) | upsert(userId, date, {weekLabel, dayTitle, completed, totalItems})
//   integrations get(userId, provider) | set(userId, provider, {baseUrl, encryptedToken, accountName}) | remove(userId, provider)
//   briefs       get(userId, date) | save(userId, date, brief) | markAccepted(userId, date)
import { config } from "../config.js";
import { jsonStore } from "./jsonStore.js";
import { createSupabaseStore } from "./supabaseStore.js";

export const db = config.supabase ? createSupabaseStore(config.supabase) : jsonStore;
