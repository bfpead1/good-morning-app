// Supabase implementation of the data store. Activated by setting SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY (see db/index.js). Tables come from
// supabase/migrations/0001_initial_schema.sql. Returns the same camelCase shapes as
// jsonStore.js so routes don't care which store is active.
import { createClient } from "@supabase/supabase-js";
import { mergeTokens } from "./tokens.js";

export function createSupabaseStore({ url, serviceRoleKey }) {
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  /** Unwraps a Supabase response, throwing on error so Express's error handler sees it. */
  async function run(query) {
    const { data, error } = await query;
    if (error) throw new Error(`Supabase: ${error.message}`);
    return data;
  }

  const toUser = (row) =>
    row && {
      id: row.id,
      email: row.email,
      name: row.name,
      picture: row.picture,
      tokens: row.google_tokens ?? {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

  const toMetric = (row) => ({
    id: row.id,
    measuredOn: row.measured_on,
    weightLbs: row.weight_lbs === null ? null : Number(row.weight_lbs),
    muscleMassLbs: row.muscle_mass_lbs === null ? null : Number(row.muscle_mass_lbs),
    bodyFatPct: row.body_fat_pct === null ? null : Number(row.body_fat_pct),
    note: row.note,
    createdAt: row.created_at,
  });

  const toSuggestion = (row) =>
    row && {
      id: row.id,
      kind: row.kind,
      target: row.target,
      request: row.request,
      summary: row.summary,
      changes: row.changes,
      plan: row.plan,
      status: row.status,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
    };

  const toLog = (row) => ({
    date: row.log_date,
    weekLabel: row.week_label,
    dayTitle: row.day_title,
    completed: row.completed,
    totalItems: row.total_items,
    updatedAt: row.updated_at,
  });

  const toBrief = (row) =>
    row && { brief: row.brief, createdAt: row.created_at, acceptedAt: row.accepted_at };

  return {
    kind: "supabase",

    users: {
      async listIds() {
        return (await run(sb.from("users").select("id"))).map((r) => r.id);
      },
      async get(id) {
        return toUser(await run(sb.from("users").select().eq("id", id).maybeSingle()));
      },
      async upsert(id, { tokens, email, name, picture }) {
        const existing = await this.get(id);
        const row = await run(
          sb
            .from("users")
            .upsert({
              id,
              email,
              name,
              picture,
              google_tokens: mergeTokens(existing?.tokens, tokens),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single(),
        );
        return toUser(row);
      },
      async updateTokens(id, tokens) {
        const existing = await this.get(id);
        if (!existing) return;
        await run(
          sb
            .from("users")
            .update({
              google_tokens: mergeTokens(existing.tokens, tokens),
              updated_at: new Date().toISOString(),
            })
            .eq("id", id),
        );
      },
      async delete(id) {
        // Child tables cascade.
        await run(sb.from("users").delete().eq("id", id));
      },
    },

    settings: {
      async get(userId) {
        const row = await run(
          sb.from("user_settings").select("settings").eq("user_id", userId).maybeSingle(),
        );
        return row?.settings ?? {};
      },
      async update(userId, patch) {
        const settings = { ...(await this.get(userId)), ...patch };
        await run(
          sb
            .from("user_settings")
            .upsert({ user_id: userId, settings, updated_at: new Date().toISOString() }),
        );
        return settings;
      },
    },

    bodyMetrics: {
      async list(userId) {
        const rows = await run(
          sb
            .from("body_metrics")
            .select()
            .eq("user_id", userId)
            .order("measured_on", { ascending: false })
            .order("created_at", { ascending: false }),
        );
        return rows.map(toMetric);
      },
      async add(userId, entry) {
        const row = await run(
          sb
            .from("body_metrics")
            .insert({
              user_id: userId,
              measured_on: entry.measuredOn,
              weight_lbs: entry.weightLbs,
              muscle_mass_lbs: entry.muscleMassLbs,
              body_fat_pct: entry.bodyFatPct,
              note: entry.note,
            })
            .select()
            .single(),
        );
        return toMetric(row);
      },
      async remove(userId, id) {
        await run(sb.from("body_metrics").delete().eq("user_id", userId).eq("id", id));
      },
    },

    scripture: {
      async getProgress(userId) {
        const rows = await run(
          sb.from("scripture_progress").select().eq("user_id", userId).eq("completed", true),
        );
        const progress = {};
        for (const row of rows) {
          progress[row.book_slug] ??= {};
          progress[row.book_slug][row.chapter] = {
            completed: true,
            completedVia: row.completed_via,
            completedAt: row.completed_at,
          };
        }
        return progress;
      },
      async setChapters(userId, records) {
        const done = records.filter((r) => r.completed);
        const undone = records.filter((r) => !r.completed);
        if (done.length) {
          await run(
            sb.from("scripture_progress").upsert(
              done.map((r) => ({
                user_id: userId,
                book_slug: r.slug,
                chapter: r.chapter,
                completed: true,
                completed_via: r.completedVia,
                completed_at: r.completedAt,
              })),
            ),
          );
        }
        for (const r of undone) {
          await run(
            sb
              .from("scripture_progress")
              .delete()
              .eq("user_id", userId)
              .eq("book_slug", r.slug)
              .eq("chapter", r.chapter),
          );
        }
      },
    },

    workoutPlans: {
      async getActive(userId) {
        const row = await run(
          sb
            .from("workout_plans")
            .select()
            .eq("user_id", userId)
            .eq("is_active", true)
            .maybeSingle(),
        );
        return (
          row && {
            id: row.id,
            plan: row.plan,
            source: row.source,
            summary: row.summary,
            createdAt: row.created_at,
          }
        );
      },
      async setActive(userId, { plan, source, summary }) {
        await this.clearActive(userId);
        const row = await run(
          sb
            .from("workout_plans")
            .insert({ user_id: userId, plan, source, summary, is_active: true })
            .select()
            .single(),
        );
        return { id: row.id, plan: row.plan, source: row.source, summary: row.summary, createdAt: row.created_at };
      },
      async clearActive(userId) {
        // Previous versions are kept (inactive) for history.
        await run(
          sb.from("workout_plans").update({ is_active: false }).eq("user_id", userId).eq("is_active", true),
        );
      },
    },

    suggestions: {
      async create(userId, { kind, target, request, summary, changes, plan }) {
        const row = await run(
          sb
            .from("workout_suggestions")
            .insert({ user_id: userId, kind, target, request, summary, changes, plan })
            .select()
            .single(),
        );
        return toSuggestion(row);
      },
      async get(userId, id) {
        return toSuggestion(
          await run(
            sb.from("workout_suggestions").select().eq("user_id", userId).eq("id", id).maybeSingle(),
          ),
        );
      },
      async latestPending(userId) {
        return toSuggestion(
          await run(
            sb
              .from("workout_suggestions")
              .select()
              .eq("user_id", userId)
              .eq("status", "pending")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ),
        );
      },
      async setStatus(userId, id, status) {
        await run(
          sb
            .from("workout_suggestions")
            .update({ status, resolved_at: new Date().toISOString() })
            .eq("user_id", userId)
            .eq("id", id),
        );
      },
    },

    integrations: {
      async get(userId, provider) {
        const row = await run(
          sb.from("user_integrations").select().eq("user_id", userId).eq("provider", provider).maybeSingle(),
        );
        return (
          row && {
            baseUrl: row.base_url,
            encryptedToken: row.encrypted_token,
            accountName: row.account_name,
            connectedAt: row.connected_at,
          }
        );
      },
      async set(userId, provider, { baseUrl, encryptedToken, accountName }) {
        await run(
          sb.from("user_integrations").upsert({
            user_id: userId,
            provider,
            base_url: baseUrl,
            encrypted_token: encryptedToken,
            account_name: accountName,
            connected_at: new Date().toISOString(),
          }),
        );
        return this.get(userId, provider);
      },
      async remove(userId, provider) {
        await run(sb.from("user_integrations").delete().eq("user_id", userId).eq("provider", provider));
      },
    },

    workoutLogs: {
      async list(userId, { since } = {}) {
        let query = sb.from("workout_logs").select().eq("user_id", userId);
        if (since) query = query.gte("log_date", since);
        const rows = await run(query.order("log_date", { ascending: false }));
        return rows.map(toLog);
      },
      async upsert(userId, date, { weekLabel, dayTitle, completed, totalItems }) {
        const row = await run(
          sb
            .from("workout_logs")
            .upsert({
              user_id: userId,
              log_date: date,
              week_label: weekLabel,
              day_title: dayTitle,
              completed,
              total_items: totalItems,
              updated_at: new Date().toISOString(),
            })
            .select()
            .single(),
        );
        return toLog(row);
      },
    },

    briefs: {
      async get(userId, date) {
        return toBrief(
          await run(
            sb.from("daily_briefs").select().eq("user_id", userId).eq("brief_date", date).maybeSingle(),
          ),
        );
      },
      async save(userId, date, brief) {
        return toBrief(
          await run(
            sb
              .from("daily_briefs")
              .upsert({
                user_id: userId,
                brief_date: date,
                brief,
                accepted_at: null,
                created_at: new Date().toISOString(),
              })
              .select()
              .single(),
          ),
        );
      },
      async markAccepted(userId, date) {
        await run(
          sb
            .from("daily_briefs")
            .update({ accepted_at: new Date().toISOString() })
            .eq("user_id", userId)
            .eq("brief_date", date),
        );
      },
    },
  };
}
