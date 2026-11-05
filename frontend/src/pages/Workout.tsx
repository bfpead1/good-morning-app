import { useState } from "react";
import { Card, ListRow } from "../components/Card";
import { PrimaryButton, SecondaryButton } from "../components/PrimaryButton";
import { SectionLabel } from "../components/SectionLabel";
import { localDateString } from "../lib/api";
import { aiMessage } from "../lib/plan";
import { useSettings, useUpdateSettings } from "../lib/settings";
import {
  type BodyMetric,
  itemCount,
  itemKey,
  type PlanDay,
  type PlanItem,
  type PlanSection,
  type WorkoutPlan,
  rotationWeekIndex,
  todaysWorkout,
  useAddBodyMetric,
  useBodyMetrics,
  useDeleteBodyMetric,
  usePendingSuggestion,
  useGenerateWorkout,
  useResetPlan,
  useResolveSuggestion,
  useSaveWorkoutLog,
  useWorkoutLogs,
  useWorkoutPlan,
  type Suggestion,
  type Weekday,
  WEEKDAY_NAMES,
  WEEKDAY_ORDER,
} from "../lib/workout";

export function Workout() {
  const settings = useSettings();
  const active = useWorkoutPlan();

  if (!settings.data || !active.data) {
    return <p className="px-6 pt-7 text-[14px] text-ink-soft-62">Loading…</p>;
  }

  const { plan } = active.data;
  const { workoutCycleStart, workoutOverride } = settings.data;
  const { week, day, overridden } = todaysWorkout(plan, workoutCycleStart, workoutOverride);
  const scheduled = todaysWorkout(plan, workoutCycleStart);

  return (
    <div className="px-6 pb-8 pt-7">
      <h1 className="font-display text-[22px] font-medium text-ink">Workout</h1>
      <p className="mb-5 text-[13px] text-ink-soft-55">
        {active.data.source === "default"
          ? "Your 2-week training plan"
          : `${plan.name} · updated by AI${active.data.updatedAt ? ` on ${new Date(active.data.updatedAt).toLocaleDateString()}` : ""}`}
      </p>

      <section className="mb-5">
        <SectionLabel>Today · {week.label}</SectionLabel>
        <ChooseWorkout
          plan={plan}
          value={overridden ? `${workoutOverride!.weekIndex}:${workoutOverride!.weekday}` : "scheduled"}
          scheduledLabel={scheduled.day ? `${scheduled.week.label} · ${scheduled.day.title}` : "None"}
        />
        {day ? <TodayWorkout weekLabel={week.label} day={day} /> : <Card>No workout found for today.</Card>}
      </section>

      <RecentWorkouts />
      <BodyMetricsSection />
      <AiWorkoutSection aiEnabled={settings.data.features.ai} plan={plan} currentWeekIndex={scheduled.weekIndex} />
      <RotationSection plan={plan} cycleStart={workoutCycleStart} />

      {active.data.source !== "default" && <ResetPlan summary={active.data.summary} />}
    </div>
  );
}

/** Pick a different workout from the plan for today only; tomorrow goes back to the schedule. */
function ChooseWorkout({ plan, value, scheduledLabel }: { plan: WorkoutPlan; value: string; scheduledLabel: string }) {
  const updateSettings = useUpdateSettings();

  function choose(next: string) {
    if (next === "scheduled") {
      updateSettings.mutate({ workoutOverride: null });
      return;
    }
    const [weekIndex, weekday] = next.split(":");
    updateSettings.mutate({
      workoutOverride: { date: localDateString(), weekIndex: Number(weekIndex), weekday: weekday as Weekday },
    });
  }

  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-[12px] font-medium text-ink-soft-62">Today's workout</span>
      <select
        value={value}
        onChange={(e) => choose(e.target.value)}
        disabled={updateSettings.isPending}
        className={inputClass}
      >
        <option value="scheduled">Scheduled: {scheduledLabel}</option>
        {dayOptions(plan)
          .filter((o) => !o.label.endsWith("— Rest"))
          .map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
      </select>
    </label>
  );
}

// ─── Today's check-offs ────────────────────────────────────────────────────

/** Present when a DayCard is checkable (today's workout); absent for the read-only rotation view. */
type Checks = { done: Set<string>; toggle: (key: string) => void };

function TodayWorkout({ weekLabel, day }: { weekLabel: string; day: PlanDay }) {
  const logs = useWorkoutLogs();
  const save = useSaveWorkoutLog();
  const today = localDateString();
  const total = itemCount(day);

  // Ignore a log for a different workout (e.g. the plan changed after checking things off).
  const log = logs.data?.find((l) => l.date === today && l.dayTitle === day.title);
  const done = new Set(log?.completed ?? []);
  const allKeys = day.sections.flatMap((s) => s.items.map((i) => itemKey(s, i)));

  function saveDone(next: Set<string>) {
    save.mutate({
      date: today,
      weekLabel,
      dayTitle: day.title,
      // Keep plan order so the log reads naturally.
      completed: allKeys.filter((k) => next.has(k)),
      totalItems: total,
    });
  }

  const checks: Checks = {
    done,
    toggle: (key) => {
      const next = new Set(done);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveDone(next);
    },
  };

  if (day.type === "rest" || total === 0) return <DayCard day={day} />;

  const count = allKeys.filter((k) => done.has(k)).length;
  const allDone = count === total;

  return (
    <DayCard
      day={day}
      checks={checks}
      header={
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-[13px]">
            <span className="font-semibold text-ink">
              {allDone ? "Workout complete! 💪" : `${count} of ${total} done`}
            </span>
            <button
              type="button"
              onClick={() => saveDone(allDone ? new Set() : new Set(allKeys))}
              className="font-semibold text-ink-soft-62 underline"
            >
              {allDone ? "Clear all" : "Check all"}
            </button>
          </div>
          <div className="h-1.5 overflow-hidden rounded-pill bg-divider">
            <div
              className="h-full rounded-pill bg-ink transition-[width]"
              style={{ width: `${Math.round((count / total) * 100)}%` }}
            />
          </div>
          {save.isError && (
            <p className="mt-2 text-[12.5px] text-ink">Couldn't save that change. Check your connection.</p>
          )}
        </div>
      }
    />
  );
}

function RecentWorkouts() {
  const logs = useWorkoutLogs(14);
  const recent = (logs.data ?? []).filter((l) => l.completed.length > 0).slice(0, 7);
  if (!recent.length) return null;

  return (
    <section className="mb-5">
      <SectionLabel>Recent Workouts</SectionLabel>
      <Card padded={false}>
        {recent.map((log, i) => {
          const pct = log.totalItems ? Math.round((log.completed.length / log.totalItems) * 100) : 0;
          return (
            <ListRow key={log.date} first={i === 0} className="justify-between">
              <div className="min-w-0">
                <p className="truncate text-[14.5px] text-ink">{log.dayTitle}</p>
                <p className="text-[12.5px] text-ink-soft-55">
                  {new Date(`${log.date}T00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  {" · "}
                  {log.weekLabel}
                </p>
              </div>
              <span className={`shrink-0 text-[13px] font-semibold ${pct === 100 ? "text-ink" : "text-ink-soft-62"}`}>
                {log.completed.length}/{log.totalItems}
              </span>
            </ListRow>
          );
        })}
      </Card>
    </section>
  );
}

// ─── Plan display ──────────────────────────────────────────────────────────

function DayCard({
  day,
  compact = false,
  checks,
  header,
}: {
  day: PlanDay;
  compact?: boolean;
  checks?: Checks;
  header?: React.ReactNode;
}) {
  return (
    <Card padded={false}>
      <div className="px-[18px] pb-2 pt-4">
        {compact && (
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-soft-55">
            {WEEKDAY_NAMES[day.weekday]}
          </p>
        )}
        <p className="font-display text-[19px] font-medium text-ink">{day.title}</p>
        {day.type !== "rest" && (
          <p className="text-[13px] text-ink-soft-62">~{day.durationMinutes} min</p>
        )}
        {header}
      </div>
      {day.sections.map((section) => (
        <SectionBlock key={section.title} section={section} checks={checks} />
      ))}
      {day.note && (
        <p className="border-t border-divider px-[18px] py-3 text-[13px] italic leading-relaxed text-ink-soft-62">
          {day.note}
        </p>
      )}
    </Card>
  );
}

/** Round check toggle used for every item type. */
function CheckButton({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] transition-colors ${
        checked ? "bg-ink text-cta-on-ink" : "border-[1.5px] border-ink/35"
      }`}
    >
      {checked && "✓"}
    </button>
  );
}

function SectionBlock({ section, checks }: { section: PlanSection; checks?: Checks }) {
  const isDone = (item: PlanItem) => checks?.done.has(itemKey(section, item)) ?? false;
  const toggle = (item: PlanItem) => checks?.toggle(itemKey(section, item));

  return (
    <div className="border-t border-divider px-[18px] py-3">
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-soft-55">
        {section.title}
      </p>

      {section.kind === "hiit" ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {section.items.map((item) => {
            const done = isDone(item);
            const content = (
              <>
                <p className={`text-[13.5px] font-medium ${done ? "text-cta-on-ink" : "text-ink"}`}>
                  {done && "✓ "}
                  {item.name}
                </p>
                {item.amount && (
                  <p className={`text-[12px] ${done ? "text-cta-on-ink/80" : "text-ink-soft-55"}`}>{item.amount}</p>
                )}
              </>
            );
            return checks ? (
              <button
                key={item.name}
                type="button"
                role="checkbox"
                aria-checked={done}
                onClick={() => toggle(item)}
                className={`rounded-button px-3 py-2 text-center transition-colors ${done ? "bg-ink" : "bg-page/40"}`}
              >
                {content}
              </button>
            ) : (
              <div key={item.name} className="rounded-button bg-page/40 px-3 py-2 text-center">
                {content}
              </div>
            );
          })}
        </div>
      ) : section.kind === "percentages" ? (
        <table className="w-full text-left text-[13.5px] text-ink">
          <thead>
            <tr className="text-[12px] text-ink-soft-55">
              {checks && <th className="w-8 pb-1" aria-label="Done" />}
              <th className="pb-1 font-medium">Set</th>
              <th className="pb-1 font-medium">Reps</th>
              <th className="pb-1 font-medium">Load</th>
            </tr>
          </thead>
          <tbody>
            {section.items.map((item) => (
              <tr key={item.name} className={`border-t border-divider ${isDone(item) ? "text-ink-soft-55" : ""}`}>
                {checks && (
                  <td className="py-1.5">
                    <CheckButton checked={isDone(item)} label={item.name} onToggle={() => toggle(item)} />
                  </td>
                )}
                <td className="py-1.5">{item.name}</td>
                <td className="py-1.5">{item.amount}</td>
                <td className="py-1.5 font-medium">{item.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ul className="space-y-2.5">
          {section.items.map((item) => {
            const done = isDone(item);
            return (
              <li key={item.name} className="flex items-start gap-3">
                {checks && <CheckButton checked={done} label={item.name} onToggle={() => toggle(item)} />}
                <div className="min-w-0 flex-1">
                  <p className={`text-[14.5px] font-medium ${done ? "text-ink-soft-55 line-through" : "text-ink"}`}>
                    {item.name}
                    {item.swap && (
                      <span className="ml-2 rounded bg-accent px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-ink no-underline">
                        Swap
                      </span>
                    )}
                  </p>
                  {item.detail && <p className="text-[12.5px] text-ink-soft-55">{item.detail}</p>}
                </div>
                {item.amount && (
                  <span className="shrink-0 pt-0.5 text-[13px] text-ink-soft-62">{item.amount}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RotationSection({ plan, cycleStart }: { plan: WorkoutPlan; cycleStart: string }) {
  const currentWeek = rotationWeekIndex(plan, cycleStart);
  const [shown, setShown] = useState(currentWeek);
  const updateSettings = useUpdateSettings();
  const week = plan.weeks[shown] ?? plan.weeks[0];

  /** Re-anchors the rotation so that this calendar week is `index`. */
  function setCurrentWeek(index: number) {
    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) - index * 7);
    updateSettings.mutate({ workoutCycleStart: localDateString(monday) });
    setShown(index);
  }

  return (
    <section className="mb-5">
      <SectionLabel>Full Rotation</SectionLabel>
      <div className="mb-3 flex flex-wrap gap-2">
        {plan.weeks.map((w, i) => (
          <button
            key={w.label}
            type="button"
            onClick={() => setShown(i)}
            className={`rounded-pill px-3.5 py-1.5 text-[13px] font-semibold ${
              i === shown ? "bg-ink text-cta-on-ink" : "border border-ink/25 text-ink"
            }`}
          >
            {w.label}
            {i === currentWeek && " · now"}
          </button>
        ))}
      </div>

      {shown !== currentWeek && (
        <button
          type="button"
          onClick={() => setCurrentWeek(shown)}
          className="mb-3 text-[13px] font-semibold text-ink underline"
        >
          Make {week.label} this week's workout
        </button>
      )}

      {week.banner && (
        <p className="mb-3 rounded-card border border-card-border bg-card p-[18px] text-[13.5px] leading-relaxed text-ink">
          {week.banner}
        </p>
      )}

      <div className="space-y-3">
        {week.days.map((day) => (
          <details key={day.weekday} className="group">
            <summary className="flex cursor-pointer items-center justify-between rounded-card border border-card-border bg-card px-[18px] py-3">
              <span className="text-[14.5px] text-ink">
                <span className="inline-block w-24 text-ink-soft-55">{WEEKDAY_NAMES[day.weekday]}</span>
                {day.title}
              </span>
              <span className="text-[13px] text-ink-soft-55 group-open:hidden">Show</span>
              <span className="hidden text-[13px] text-ink-soft-55 group-open:inline">Hide</span>
            </summary>
            <div className="mt-2">
              <DayCard day={day} compact />
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function ResetPlan({ summary }: { summary: string | null }) {
  const reset = useResetPlan();
  return (
    <section className="mb-2">
      <Card>
        {summary && (
          <p className="mb-3 text-[13.5px] leading-relaxed text-ink-soft-62">
            Last change: {summary}
          </p>
        )}
        <SecondaryButton
          onClick={() => {
            if (confirm("Go back to your original 2-week plan?")) reset.mutate();
          }}
          disabled={reset.isPending}
        >
          Restore original 2-week plan
        </SecondaryButton>
      </Card>
    </section>
  );
}

// ─── Body metrics ──────────────────────────────────────────────────────────

const METRIC_FIELDS = [
  { key: "weightLbs", label: "Weight", unit: "lbs" },
  { key: "muscleMassLbs", label: "Muscle mass", unit: "lbs" },
  { key: "bodyFatPct", label: "Body fat", unit: "%" },
] as const;

type MetricKey = (typeof METRIC_FIELDS)[number]["key"];

/** Most recent value of a metric, and its change versus the entry before that. */
function latest(metrics: BodyMetric[], key: MetricKey) {
  const withValue = metrics.filter((m) => m[key] !== null);
  if (!withValue.length) return null;
  const value = withValue[0][key]!;
  const previous = withValue[1]?.[key] ?? null;
  return { value, change: previous === null ? null : Math.round((value - previous) * 10) / 10 };
}

function BodyMetricsSection() {
  const metrics = useBodyMetrics();
  const add = useAddBodyMetric();
  const remove = useDeleteBodyMetric();
  const [form, setForm] = useState({
    measuredOn: localDateString(),
    weightLbs: "",
    muscleMassLbs: "",
    bodyFatPct: "",
    note: "",
  });
  const [showHistory, setShowHistory] = useState(false);

  const toNumber = (s: string) => (s.trim() === "" ? null : Number(s));
  const canSave =
    [form.weightLbs, form.muscleMassLbs, form.bodyFatPct].some((v) => v.trim() !== "") &&
    [form.weightLbs, form.muscleMassLbs, form.bodyFatPct].every((v) => v.trim() === "" || !Number.isNaN(Number(v)));

  function save(e: React.FormEvent) {
    e.preventDefault();
    add.mutate(
      {
        measuredOn: form.measuredOn,
        weightLbs: toNumber(form.weightLbs),
        muscleMassLbs: toNumber(form.muscleMassLbs),
        bodyFatPct: toNumber(form.bodyFatPct),
        note: form.note.trim() || null,
      },
      { onSuccess: () => setForm({ ...form, weightLbs: "", muscleMassLbs: "", bodyFatPct: "", note: "" }) },
    );
  }

  const entries = metrics.data ?? [];

  return (
    <section className="mb-5">
      <SectionLabel>Body Metrics</SectionLabel>
      <Card padded={false}>
        <div className="grid grid-cols-3 divide-x divide-divider">
          {METRIC_FIELDS.map(({ key, label, unit }) => {
            const stat = latest(entries, key);
            return (
              <div key={key} className="px-3 py-4 text-center">
                <p className="text-[12px] text-ink-soft-55">{label}</p>
                <p className="font-display text-[20px] font-medium text-ink">
                  {stat ? `${stat.value}${unit === "%" ? "%" : ""}` : "—"}
                </p>
                <p className="text-[12px] text-ink-soft-55">
                  {stat?.change ? `${stat.change > 0 ? "+" : ""}${stat.change} ${unit === "%" ? "pts" : unit}` : unit === "%" ? "" : unit}
                </p>
              </div>
            );
          })}
        </div>

        <form onSubmit={save} className="border-t border-divider p-[18px]">
          <div className="mb-3 grid grid-cols-2 gap-3">
            <Field label="Date">
              <input
                type="date"
                value={form.measuredOn}
                max={localDateString()}
                onChange={(e) => setForm({ ...form, measuredOn: e.target.value })}
                className={inputClass}
                required
              />
            </Field>
            {METRIC_FIELDS.map(({ key, label, unit }) => (
              <Field key={key} label={`${label} (${unit})`}>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className={inputClass}
                />
              </Field>
            ))}
          </div>
          <Field label="Note (optional)">
            <input
              type="text"
              value={form.note}
              maxLength={500}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="e.g. morning, before breakfast"
              className={inputClass}
            />
          </Field>
          {add.isError && <p className="mt-2 text-[13px] text-ink">Couldn't save that entry.</p>}
          <PrimaryButton type="submit" className="mt-3" disabled={!canSave || add.isPending}>
            Log measurements
          </PrimaryButton>
        </form>

        {entries.length > 0 && (
          <div className="border-t border-divider">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="w-full px-[18px] py-3 text-left text-[14px] font-semibold text-ink"
            >
              {showHistory ? "Hide history" : `Show history (${entries.length})`}
            </button>
            {showHistory &&
              entries.map((m) => (
                <ListRow key={m.id} className="justify-between">
                  <div className="min-w-0">
                    <p className="text-[14px] text-ink">
                      {new Date(`${m.measuredOn}T00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="text-[12.5px] text-ink-soft-55">
                      {[
                        m.weightLbs !== null && `${m.weightLbs} lbs`,
                        m.muscleMassLbs !== null && `${m.muscleMassLbs} lbs muscle`,
                        m.bodyFatPct !== null && `${m.bodyFatPct}% fat`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      {m.note && ` · ${m.note}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove.mutate(m.id)}
                    className="shrink-0 text-[13px] text-ink-soft-55"
                    aria-label={`Delete entry from ${m.measuredOn}`}
                  >
                    Delete
                  </button>
                </ListRow>
              ))}
          </div>
        )}
      </Card>
    </section>
  );
}

const inputClass =
  "w-full rounded-button border border-card-border bg-page/30 px-3 py-2 text-[14px] text-ink";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-ink-soft-62">{label}</span>
      {children}
    </label>
  );
}

// ─── AI workout generator ──────────────────────────────────────────────────

/** "Week 1 · Monday — Push & Pull A" options for every day in the plan. */
function dayOptions(plan: WorkoutPlan) {
  return plan.weeks.flatMap((week, weekIndex) =>
    week.days.map((day) => ({
      value: `${weekIndex}:${day.weekday}`,
      label: `${week.label} · ${WEEKDAY_NAMES[day.weekday]} — ${day.title}`,
      weekIndex,
      weekday: day.weekday,
    })),
  );
}

function AiWorkoutSection({ aiEnabled, plan, currentWeekIndex }: { aiEnabled: boolean; plan: WorkoutPlan; currentWeekIndex: number }) {
  const pending = usePendingSuggestion();
  const [mode, setMode] = useState<"edit_day" | "new_plan">("edit_day");

  return (
    <section className="mb-5">
      <SectionLabel>AI Coach</SectionLabel>
      <Card>
        {!aiEnabled ? (
          <p className="text-[14px] leading-relaxed text-ink-soft-62">
            The AI coach can rewrite a day of your plan or build a brand-new plan. Add a free Groq
            API key as <code>GROQ_API_KEY</code> in <code>backend/.env</code> to turn it on.
          </p>
        ) : pending.data ? (
          <SuggestionReview suggestion={pending.data} />
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-pill bg-page/40 p-1" role="tablist">
              {(
                [
                  ["edit_day", "Edit a day"],
                  ["new_plan", "Build a new plan"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={mode === value}
                  onClick={() => setMode(value)}
                  className={`rounded-pill py-2 text-[13.5px] font-semibold ${
                    mode === value ? "bg-ink text-cta-on-ink" : "text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {mode === "edit_day" ? (
              <EditDayForm plan={plan} currentWeekIndex={currentWeekIndex} />
            ) : (
              <NewPlanForm />
            )}
          </>
        )}
      </Card>
    </section>
  );
}

function EditDayForm({ plan, currentWeekIndex }: { plan: WorkoutPlan; currentWeekIndex: number }) {
  const generate = useGenerateWorkout();
  const options = dayOptions(plan);
  // Defaults to today's day in the current week.
  const [selected, setSelected] = useState(
    () => `${currentWeekIndex}:${WEEKDAY_ORDER[(new Date().getDay() + 6) % 7]}`,
  );
  const [notes, setNotes] = useState("");
  const choice = options.find((o) => o.value === selected) ?? options[0];

  return (
    <div>
      <p className="mb-3 text-[13.5px] leading-relaxed text-ink-soft-62">
        Rewrite one day using your goals, equipment, and what you've checked off. You review the
        result before anything changes.
      </p>
      <Field label="Day to edit">
        <select value={choice.value} onChange={(e) => setSelected(e.target.value)} className={inputClass}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="mt-3">
        <Field label="What should change? (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="e.g. Sore left shoulder — go easier on pressing. Or: make it 40 minutes."
            className={inputClass}
          />
        </Field>
      </div>
      {generate.isError && (
        <p className="mt-2 text-[13px] text-ink">{aiMessage(generate.error, "Couldn't edit that day right now.")}</p>
      )}
      <PrimaryButton
        className="mt-3"
        disabled={generate.isPending}
        onClick={() =>
          generate.mutate(
            { mode: "edit_day", weekIndex: choice.weekIndex, weekday: choice.weekday, notes },
            { onSuccess: () => setNotes("") },
          )
        }
      >
        {generate.isPending ? "Rewriting…" : "Edit this day with AI"}
      </PrimaryButton>
    </div>
  );
}

function NewPlanForm() {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const generate = useGenerateWorkout();
  const [profile, setProfile] = useState(settings.data!.workoutProfile);
  const [notes, setNotes] = useState("");

  async function build() {
    // Save the profile first so the server designs around exactly what's on screen.
    await updateSettings.mutateAsync({ workoutProfile: profile });
    generate.mutate({ mode: "new_plan", notes }, { onSuccess: () => setNotes("") });
  }

  const busy = generate.isPending || updateSettings.isPending;

  return (
    <div>
      <p className="mb-3 text-[13.5px] leading-relaxed text-ink-soft-62">
        Design a brand-new one-week plan from scratch. Your current plan is ignored and only
        replaced if you apply the result.
      </p>
      <div className="space-y-3">
        <Field label="Goals">
          <textarea
            value={profile.goals}
            onChange={(e) => setProfile({ ...profile, goals: e.target.value })}
            rows={2}
            maxLength={500}
            className={inputClass}
          />
        </Field>
        <Field label="Available equipment">
          <textarea
            value={profile.equipment}
            onChange={(e) => setProfile({ ...profile, equipment: e.target.value })}
            rows={2}
            maxLength={500}
            className={inputClass}
          />
        </Field>
        <Field label="Training days per week">
          <select
            value={profile.daysPerWeek}
            onChange={(e) => setProfile({ ...profile, daysPerWeek: Number(e.target.value) })}
            className={inputClass}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Anything else? (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="e.g. Sore shoulder. Prefer mornings under an hour."
            className={inputClass}
          />
        </Field>
      </div>
      {generate.isError && (
        <p className="mt-2 text-[13px] text-ink">{aiMessage(generate.error, "Couldn't build a plan right now.")}</p>
      )}
      <PrimaryButton className="mt-3" disabled={busy || !profile.goals.trim()} onClick={build}>
        {busy ? "Designing your plan…" : "Build a new plan"}
      </PrimaryButton>
    </div>
  );
}

function SuggestionReview({ suggestion }: { suggestion: Suggestion }) {
  const resolve = useResolveSuggestion();
  const target = suggestion.target;
  const editedDay =
    suggestion.kind === "edit_day" && target
      ? suggestion.plan.weeks[target.weekIndex]?.days.find((d) => d.weekday === target.weekday)
      : undefined;
  const isNewPlan = suggestion.kind === "new_plan";

  return (
    <div>
      <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-ink-soft-55">
        {isNewPlan
          ? `New plan: ${suggestion.plan.name}`
          : target && `Edit · ${suggestion.plan.weeks[target.weekIndex]?.label} · ${WEEKDAY_NAMES[target.weekday]}`}
      </p>
      {suggestion.request && (
        <p className="mb-2 text-[13px] italic text-ink-soft-55">You asked: {suggestion.request}</p>
      )}
      <p className="mb-3 text-[14.5px] leading-relaxed text-ink">{suggestion.summary}</p>

      {suggestion.changes.length > 0 && (
        <ul className="mb-4 space-y-2">
          {suggestion.changes.map((c, i) => (
            <li key={i} className="rounded-button bg-page/40 p-3">
              <p className="text-[14px] text-ink">{c.change}</p>
              <p className="text-[12.5px] text-ink-soft-62">{c.why}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mb-4 space-y-2">
        {editedDay && <DayCard day={editedDay} compact />}
        {isNewPlan &&
          suggestion.plan.weeks[0]?.days.map((day) => (
            <details key={day.weekday} className="group">
              <summary className="flex cursor-pointer items-center justify-between rounded-button bg-page/40 px-3 py-2.5">
                <span className="text-[14px] text-ink">
                  <span className="inline-block w-24 text-ink-soft-55">{WEEKDAY_NAMES[day.weekday]}</span>
                  {day.title}
                </span>
                <span className="text-[12.5px] text-ink-soft-55">
                  {day.type === "rest" ? "Rest" : `~${day.durationMinutes} min`}
                </span>
              </summary>
              <div className="mt-2">
                <DayCard day={day} compact />
              </div>
            </details>
          ))}
      </div>

      {resolve.isError && <p className="mb-2 text-[13px] text-ink">Couldn't save that. Try again.</p>}
      <div className="flex gap-3">
        <SecondaryButton
          onClick={() => resolve.mutate({ id: suggestion.id, action: "dismiss" })}
          disabled={resolve.isPending}
        >
          Dismiss
        </SecondaryButton>
        <PrimaryButton
          onClick={() => {
            if (isNewPlan && !confirm("Replace your current plan with this new one? It starts this week as Week 1.")) return;
            resolve.mutate({ id: suggestion.id, action: "accept" });
          }}
          disabled={resolve.isPending || (!isNewPlan && suggestion.changes.length === 0)}
        >
          {isNewPlan ? "Use this plan" : "Apply changes"}
        </PrimaryButton>
      </div>
    </div>
  );
}
