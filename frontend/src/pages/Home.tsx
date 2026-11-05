import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, ListRow } from "../components/Card";
import { EventEditor } from "../components/EventEditor";
import { GoogleDataState } from "../components/GoogleDataState";
import { PrimaryButton } from "../components/PrimaryButton";
import { SectionLabel } from "../components/SectionLabel";
import {
  BookOpenIcon,
  ChevronRightIcon,
  DumbbellIcon,
  MailIcon,
  SunCloudIcon,
} from "../components/icons";
import { thoughtForDate } from "../data/thoughts";
import { ApiError, localDateString } from "../lib/api";
import { GOOGLE_RECONNECT_URL, useCurrentUser } from "../lib/auth";
import { canvasMessage, formatDue, useCanvasStatus, useCanvasUpcoming } from "../lib/canvas";
import { aiMessage, useGeneratePlan, useTodayPlan } from "../lib/plan";
import {
  type CalendarEvent,
  formatEventTime,
  gmailUrl,
  senderName,
  useRecentEmails,
  useTodayEvents,
} from "../lib/google";
import { nextSession, sessionLabel, useScriptureProgress } from "../lib/scripture";
import { useSettings, useUpdateSettings } from "../lib/settings";
import { currentPosition, describeWeather, useWeather } from "../lib/weather";
import { itemCount, todaysWorkout, useWorkoutLogs, useWorkoutPlan } from "../lib/workout";

const today = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

export function Home() {
  const { data: user } = useCurrentUser();
  const firstName = user?.name.split(" ")[0] ?? "";
  const events = useTodayEvents();
  const emails = useRecentEmails();
  const settings = useSettings();
  const plan = useWorkoutPlan();
  const workoutLogs = useWorkoutLogs();
  const progress = useScriptureProgress();
  const todayPlan = useTodayPlan();
  const generate = useGeneratePlan();
  const aiEnabled = settings.data?.features.ai ?? false;

  // Next timed event that hasn't finished yet; all-day events aren't "up" at a time.
  const [now] = useState(Date.now);
  const firstUp = events.data?.find(
    (e) => !e.allDay && new Date(e.end).getTime() > now,
  );

  const workout =
    plan.data && settings.data
      ? todaysWorkout(plan.data.plan, settings.data.workoutCycleStart, settings.data.workoutOverride)
      : null;
  const session =
    progress.data && settings.data
      ? nextSession(progress.data, settings.data.scripturePace)
      : undefined;
  const thought = thoughtForDate();
  const doneToday =
    workoutLogs.data?.find((l) => l.date === localDateString() && l.dayTitle === workout?.day?.title)
      ?.completed.length ?? 0;
  const importantEmails = todayPlan.data?.plan.email_actions;
  const canEditCalendar = user?.connections.calendarEdit ?? false;
  const [editing, setEditing] = useState<CalendarEvent | "new" | null>(null);

  return (
    <div className="px-6 pb-8 pt-7">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-[26px] font-medium leading-tight text-ink">
            Good morning, {firstName}
          </h1>
          <p className="mt-1 text-[13px] text-ink-soft-55">{today}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent font-display text-[17px] font-semibold text-ink">
          {firstName.charAt(0).toUpperCase()}
        </div>
      </header>

      <section className="mb-5 rounded-card border border-card-border bg-card p-[18px] text-ink">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-ink/60">
          First up
        </p>
        {firstUp ? (
          <>
            <p className="mt-1 font-display text-[20px] font-medium">
              {firstUp.title}
            </p>
            <p className="text-[14px] text-ink/70">{formatEventTime(firstUp)}</p>
          </>
        ) : (
          <p className="mt-1 text-[15px] text-ink/70">
            {events.isPending
              ? "Loading…"
              : events.isError
                ? "Couldn't load your calendar."
                : "Nothing else on your calendar today."}
          </p>
        )}
      </section>

      <section className="mb-5">
        <SectionLabel>Thought for Today</SectionLabel>
        <Card>
          <p className="font-display text-[16px] italic leading-relaxed text-ink">
            “{thought.text}”
          </p>
          <p className="mt-2 text-[13px] text-ink-soft-55">— {thought.source}</p>
        </Card>
      </section>

      <section className="mb-5">
        <SectionLabel>Today's Priorities</SectionLabel>
        <Card padded={false}>
          {generate.isError && (
            <div className="flex items-center justify-between gap-3 border-b border-divider px-[18px] py-3">
              <p className="text-[13.5px] text-ink">{aiMessage(generate.error)}</p>
              <button
                type="button"
                onClick={() => generate.mutate()}
                className="shrink-0 rounded-pill border border-ink/25 px-3.5 py-1.5 text-[13px] font-semibold text-ink"
              >
                Retry
              </button>
            </div>
          )}
          {settings.data && !aiEnabled ? (
            <p className="px-[18px] py-3 text-[14px] text-ink-soft-62">
              {aiMessage(new ApiError(503, "ai_not_configured"))}
            </p>
          ) : generate.isPending ? (
            <p className="px-[18px] py-3 text-[14px] text-ink-soft-62">
              Planning your day… this usually takes 5–30 seconds.
            </p>
          ) : todayPlan.data ? (
            todayPlan.data.plan.priorities.map((p, i) => (
              <ListRow key={p.title} first={i === 0} className="items-start">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[12px] font-semibold text-ink">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] text-ink">{p.title}</p>
                  <p className="text-[13px] text-ink-soft-55">{p.reason}</p>
                </div>
                <span className="shrink-0 pt-0.5 text-[12.5px] text-ink-soft-55">
                  ~{p.estimated_minutes} min
                </span>
              </ListRow>
            ))
          ) : todayPlan.isPending ? (
            <p className="px-[18px] py-3 text-[14px] text-ink-soft-62">Loading…</p>
          ) : todayPlan.isError ? (
            <p className="px-[18px] py-3 text-[14px] text-ink-soft-62">Couldn't load today's plan.</p>
          ) : (
            !generate.isError && (
              <div className="px-[18px] py-3">
                <p className="mb-3 text-[14px] text-ink-soft-62">
                  No plan yet today. It's made automatically each morning, or you can make one now.
                </p>
                <PrimaryButton onClick={() => generate.mutate()}>Plan my day</PrimaryButton>
              </div>
            )
          )}
          <div className="flex items-center justify-between border-t border-divider">
            <Link
              to="/plan"
              className="flex flex-1 items-center gap-1 px-[18px] py-3 text-[15px] font-semibold text-ink"
            >
              View today's plan
              <ChevronRightIcon width={18} height={18} />
            </Link>
            {aiEnabled && todayPlan.data && (
              <button
                type="button"
                onClick={() => generate.mutate()}
                disabled={generate.isPending}
                className="px-[18px] py-3 text-[13.5px] font-semibold text-ink-soft-62"
              >
                {generate.isPending ? "Regenerating…" : "Regenerate"}
              </button>
            )}
          </div>
        </Card>
      </section>

      <WeatherSection />

      <section className="mb-5">
        <SectionLabel>Your Schedule</SectionLabel>
        <Card padded={false}>
          {!events.data ? (
            <GoogleDataState isPending={events.isPending} error={events.error} />
          ) : events.data.length === 0 ? (
            <p className="px-[18px] py-3 text-[14px] text-ink-soft-62">
              No events on your calendar today.
            </p>
          ) : (
            events.data.map((e, i) => {
              const row = (
                <>
                  <span className="w-[70px] shrink-0 text-[13px] text-ink-soft-55">
                    {formatEventTime(e)}
                  </span>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span className="text-[15px] text-ink">{e.title}</span>
                </>
              );
              return canEditCalendar && e.editable ? (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEditing(e)}
                  className={`flex w-full items-center gap-3 px-[18px] py-3 text-left ${i === 0 ? "" : "border-t border-divider"}`}
                >
                  {row}
                  <ChevronRightIcon width={16} height={16} className="ml-auto shrink-0 text-ink-soft-42" />
                </button>
              ) : (
                <ListRow key={e.id} first={i === 0}>
                  {row}
                </ListRow>
              );
            })
          )}
          {canEditCalendar ? (
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="w-full border-t border-divider px-[18px] py-3 text-left text-[15px] font-semibold text-ink"
            >
              + Add event
            </button>
          ) : (
            user?.connections.calendar && (
              <a
                href={GOOGLE_RECONNECT_URL}
                className="block border-t border-divider px-[18px] py-3 text-[14px] font-semibold text-ink"
              >
                Allow editing your calendar
              </a>
            )
          )}
        </Card>
      </section>

      {editing && (
        <EventEditor
          event={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <CourseworkSection />

      <section className="mb-5">
        <SectionLabel>Important Emails</SectionLabel>
        <Card padded={false}>
          {importantEmails ? (
            importantEmails.length === 0 ? (
              <p className="px-[18px] py-3 text-[14px] text-ink-soft-62">
                Nothing in your inbox needs attention.
              </p>
            ) : (
              importantEmails.map((e, i) => (
                <EmailLink key={e.email_id} id={e.email_id} account={user?.email} first={i === 0}>
                  <MailIcon width={18} height={18} className="mt-0.5 shrink-0 text-ink" />
                  <div className="min-w-0">
                    <p className="text-[14px] text-ink">{e.suggestion}</p>
                    <p className="truncate text-[12.5px] text-ink-soft-55">
                      {senderName(e.from)} · {e.subject}
                    </p>
                  </div>
                </EmailLink>
              ))
            )
          ) : !emails.data ? (
            <GoogleDataState isPending={emails.isPending} error={emails.error} />
          ) : emails.data.length === 0 ? (
            <p className="px-[18px] py-3 text-[14px] text-ink-soft-62">
              No new emails in your primary inbox.
            </p>
          ) : (
            emails.data.slice(0, 5).map((e, i) => (
              <EmailLink key={e.id} id={e.id} account={user?.email} first={i === 0}>
                <MailIcon
                  width={18}
                  height={18}
                  className={`mt-0.5 shrink-0 ${e.unread ? "text-ink" : "text-ink-soft-42"}`}
                />
                <div className="min-w-0">
                  <p
                    className={`truncate text-[14px] text-ink ${e.unread ? "font-semibold" : ""}`}
                  >
                    {e.subject}
                  </p>
                  <p className="truncate text-[13px] text-ink-soft-55">
                    {senderName(e.from)}
                  </p>
                </div>
              </EmailLink>
            ))
          )}
        </Card>
      </section>

      <section className="mb-5">
        <SectionLabel>Scripture Study</SectionLabel>
        <Card>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              {session === undefined ? (
                <p className="text-[14px] text-ink-soft-62">Loading…</p>
              ) : session === null ? (
                <p className="font-display text-[19px] font-medium text-ink">
                  You've finished the Book of Mormon!
                </p>
              ) : (
                <>
                  <p className="font-display text-[19px] font-medium text-ink">
                    {sessionLabel(session.chapters)}
                  </p>
                  <p className="text-[13px] text-ink-soft-62">
                    About {session.minutes} min · Day {session.number}
                  </p>
                </>
              )}
            </div>
            <BookOpenIcon width={26} height={26} className="shrink-0 text-accent" stroke="#1e2a38" />
          </div>
          <Link to="/study">
            <PrimaryButton tabIndex={-1}>Start scripture study</PrimaryButton>
          </Link>
        </Card>
      </section>

      <section className="mb-2">
        <SectionLabel>Workout of the Day</SectionLabel>
        <Card>
          {!workout?.day ? (
            <p className="text-[14px] text-ink-soft-62">Loading…</p>
          ) : (
            <>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-[19px] font-medium text-ink">
                    {workout.day.title}
                  </p>
                  <p className="text-[13px] text-ink-soft-62">
                    {workout.week.label}
                    {workout.day.type !== "rest" &&
                      (doneToday
                        ? ` · ${doneToday} of ${itemCount(workout.day)} done`
                        : ` · ~${workout.day.durationMinutes} min · ${itemCount(workout.day)} items`)}
                  </p>
                </div>
                <DumbbellIcon width={26} height={26} className="shrink-0 text-accent" stroke="#1e2a38" />
              </div>
              {workout.day.type === "rest" ? (
                <p className="mb-4 text-[14px] text-ink-soft-62">{workout.day.note}</p>
              ) : (
                <ul className="mb-4 space-y-1.5">
                  {workout.day.sections[0].items.slice(0, 4).map((item) => (
                    <li
                      key={item.name}
                      className="flex items-center justify-between gap-3 text-[14px] text-ink"
                    >
                      <span>{item.name}</span>
                      {item.amount && (
                        <span className="shrink-0 text-ink-soft-55">{item.amount}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/workout">
                <PrimaryButton tabIndex={-1}>
                  {workout.day.type === "rest"
                    ? "View workout plan"
                    : doneToday
                      ? "Continue workout"
                      : "Start workout"}
                </PrimaryButton>
              </Link>
            </>
          )}
        </Card>
      </section>
    </div>
  );
}

/** A row in the email list that opens the message in Gmail. */
function EmailLink({
  id,
  account,
  first,
  children,
}: {
  id: string;
  account: string | undefined;
  first: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={gmailUrl(id, account)}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-start gap-3 px-[18px] py-3 ${first ? "" : "border-t border-divider"}`}
    >
      {children}
      <span className="ml-auto shrink-0 pt-0.5 text-[13px] text-ink-soft-42" aria-hidden="true">↗</span>
    </a>
  );
}

function WeatherSection() {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const location = settings.data?.location;
  const weather = useWeather(location);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  async function useMyLocation() {
    setLocating(true);
    setLocationError(null);
    try {
      updateSettings.mutate({ location: await currentPosition() });
    } catch (err) {
      setLocationError((err as Error).message);
    } finally {
      setLocating(false);
    }
  }

  return (
    <section className="mb-5">
      <SectionLabel>Weather</SectionLabel>
      <Card>
        {settings.data && !location ? (
          <div>
            <p className="mb-3 text-[14px] text-ink-soft-62">
              Set your location to see today's weather.
            </p>
            {locationError && (
              <p className="mb-3 text-[13px] text-ink-soft-62">
                {locationError}. You can search for your city in Settings instead.
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                className="rounded-pill border border-ink/25 px-3.5 py-1.5 text-[13px] font-semibold text-ink"
              >
                {locating ? "Locating…" : "Use my location"}
              </button>
              <Link
                to="/settings"
                className="rounded-pill px-3.5 py-1.5 text-[13px] font-semibold text-ink-soft-62"
              >
                Search city
              </Link>
            </div>
          </div>
        ) : weather.data ? (
          <div className="flex items-center gap-3.5">
            <SunCloudIcon
              width={30}
              height={30}
              className="shrink-0 text-accent"
              stroke="#1e2a38"
            />
            <div>
              <p className="text-[15px] font-semibold text-ink">
                {weather.data.tempNow}° now → {weather.data.tempHigh}° high
              </p>
              <p className="text-[13px] text-ink-soft-62">
                {describeWeather(weather.data)}
              </p>
              {location && (
                <p className="text-[12px] text-ink-soft-42">{location.label}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[14px] text-ink-soft-62">
            {weather.isError ? "Couldn't load the weather." : "Loading…"}
          </p>
        )}
      </Card>
    </section>
  );
}

/** Canvas work due in the next 7 days, plus anything missing. Hidden until Canvas is connected. */
function CourseworkSection() {
  const status = useCanvasStatus();
  const connected = status.data?.connected ?? false;
  const coursework = useCanvasUpcoming(connected);
  if (!connected) return null;

  const missing = coursework.data?.missing ?? [];
  const upcoming = (coursework.data?.upcoming ?? []).filter((i) => !i.done);
  const doneCount = (coursework.data?.upcoming ?? []).filter((i) => i.done).length;

  return (
    <section className="mb-5">
      <SectionLabel>Coursework</SectionLabel>
      <Card padded={false}>
        {coursework.isPending ? (
          <p className="px-[18px] py-3 text-[14px] text-ink-soft-62">Loading…</p>
        ) : coursework.isError ? (
          <div className="flex items-center justify-between gap-3 px-[18px] py-3">
            <p className="text-[14px] text-ink-soft-62">{canvasMessage(coursework.error)}</p>
            {coursework.error instanceof ApiError && coursework.error.code === "canvas_auth_failed" ? (
              <Link to="/settings" className="shrink-0 text-[13px] font-semibold text-ink underline">
                Settings
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => coursework.refetch()}
                className="shrink-0 text-[13px] font-semibold text-ink underline"
              >
                Retry
              </button>
            )}
          </div>
        ) : missing.length === 0 && upcoming.length === 0 ? (
          <p className="px-[18px] py-3 text-[14px] text-ink-soft-62">
            Nothing due in the next 7 days{doneCount ? ` — ${doneCount} already done` : ""}. 🎉
          </p>
        ) : (
          <>
            {[
              ...missing.map((item) => ({ item, missing: true })),
              ...upcoming.map((item) => ({ item, missing: false })),
            ].map(({ item, missing: isMissing }, i) => (
              <a
                key={item.id}
                href={item.url ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-start gap-3 px-[18px] py-3 ${i === 0 ? "" : "border-t border-divider"}`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isMissing ? "bg-ink" : "bg-accent"}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] text-ink">{item.title}</p>
                  <p className="truncate text-[12.5px] text-ink-soft-55">
                    {isMissing ? <strong className="font-semibold text-ink">Missing · </strong> : null}
                    {item.course ? `${item.course} · ` : ""}
                    {formatDue(item.dueAt)}
                    {item.points ? ` · ${item.points} pts` : ""}
                  </p>
                </div>
                <span className="shrink-0 pt-0.5 text-[13px] text-ink-soft-42" aria-hidden="true">↗</span>
              </a>
            ))}
            {doneCount > 0 && (
              <p className="border-t border-divider px-[18px] py-2.5 text-[12.5px] text-ink-soft-55">
                {doneCount} more due this week already submitted
              </p>
            )}
          </>
        )}
      </Card>
    </section>
  );
}
