// Timezone helpers built on Intl, so "today" means the user's day (APP_TIMEZONE)
// regardless of where the server runs.

function parts(instant, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(fmt.formatToParts(instant).map(({ type, value }) => [type, value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** "YYYY-MM-DD" for an instant in a timezone. */
export function localDate(instant, timeZone) {
  return parts(instant, timeZone).date;
}

/** "HH:MM" (24h) for an instant in a timezone. */
export function localTime(instant, timeZone) {
  return parts(instant, timeZone).time;
}

/** Minutes the timezone is ahead of UTC at an instant (e.g. -360 for MDT). */
function offsetMinutes(instant, timeZone) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(instant)
    .find((p) => p.type === "timeZoneName").value; // "GMT-06:00" or "GMT"
  const m = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

/** The UTC instant of local midnight starting `date` in `timeZone` (DST-safe). */
function startOfLocalDay(date, timeZone) {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  // Two passes settle the offset correctly across DST changes.
  let instant = guess - offsetMinutes(new Date(guess), timeZone) * 60_000;
  instant = guess - offsetMinutes(new Date(instant), timeZone) * 60_000;
  return new Date(instant);
}

/** { start, end } instants bounding the local day `date`. */
export function localDayRange(date, timeZone) {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return { start: startOfLocalDay(date, timeZone), end: startOfLocalDay(next, timeZone) };
}

/** "HH:MM" -> minutes since midnight. */
export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Weekday key ("mon".."sun") for a YYYY-MM-DD date. */
export function weekdayKey(date) {
  const [y, m, d] = date.split("-").map(Number);
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}
