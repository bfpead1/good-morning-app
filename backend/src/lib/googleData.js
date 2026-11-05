// Read-only fetchers for the Google APIs, shared by the /api/google routes and the
// daily brief. `client` is an authorized OAuth client from clientForUser().

const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

function toEvent(e) {
  return {
    id: e.id,
    title: e.summary ?? "(No title)",
    start: e.start?.dateTime ?? e.start?.date,
    end: e.end?.dateTime ?? e.end?.date,
    allDay: !e.start?.dateTime,
    location: e.location ?? null,
    description: e.description ?? null,
    htmlLink: e.htmlLink ?? null,
    // Events someone else organizes can only be edited if they allowed guests to modify them.
    editable: !e.organizer || e.organizer.self === true || e.guestsCanModify === true,
    recurring: Boolean(e.recurringEventId),
  };
}

export async function fetchEvents(client, { start, end }) {
  const { data } = await client.request({
    url: EVENTS_URL,
    params: {
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 50,
    },
  });
  return (data.items ?? []).map(toEvent);
}

/**
 * Google's start/end shape. All-day events use `date` (end is exclusive); timed events use
 * `dateTime`. The unused field is sent as null so switching between the two clears it.
 */
function eventResource({ title, description, location, allDay, start, end, timeZone }) {
  const time = (value) =>
    allDay ? { date: value, dateTime: null, timeZone: null } : { dateTime: value, date: null, timeZone };
  return {
    summary: title,
    description: description ?? null,
    location: location ?? null,
    start: time(start),
    end: time(end),
  };
}

export async function createEvent(client, input) {
  const { data } = await client.request({ url: EVENTS_URL, method: "POST", data: eventResource(input) });
  return toEvent(data);
}

/** Edits one event. For a recurring series this changes only this occurrence. */
export async function updateEvent(client, eventId, input) {
  const { data } = await client.request({
    url: `${EVENTS_URL}/${encodeURIComponent(eventId)}`,
    method: "PATCH",
    data: eventResource(input),
  });
  return toEvent(data);
}

export async function deleteEvent(client, eventId) {
  await client.request({ url: `${EVENTS_URL}/${encodeURIComponent(eventId)}`, method: "DELETE" });
}

const GMAIL_MESSAGES = "https://gmail.googleapis.com/gmail/v1/users/me/messages";

export async function fetchRecentEmails(client, { max = 10 } = {}) {
  const { data } = await client.request({
    url: GMAIL_MESSAGES,
    params: { q: "in:inbox category:primary newer_than:2d", maxResults: max },
  });

  return Promise.all(
    (data.messages ?? []).map(async ({ id }) => {
      // Gmail expects metadataHeaders repeated once per header, not comma-joined.
      const { data: msg } = await client.request({
        url: `${GMAIL_MESSAGES}/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
      });
      const header = (name) =>
        msg.payload?.headers?.find((h) => h.name === name)?.value ?? null;
      return {
        id: msg.id,
        subject: header("Subject") ?? "(No subject)",
        from: header("From"),
        date: header("Date"),
        snippet: msg.snippet ?? "",
        unread: msg.labelIds?.includes("UNREAD") ?? false,
      };
    }),
  );
}
