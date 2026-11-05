import { GOOGLE_RECONNECT_URL } from "../lib/auth";
import { ApiError } from "../lib/api";

const messages: Record<string, string> = {
  google_reauth_required: "Google access expired.",
  calendar_not_connected: "Calendar access wasn't granted.",
  gmail_not_connected: "Gmail access wasn't granted.",
  calendarEdit_not_connected: "Calendar editing wasn't granted.",
};

/** Loading / error row shown inside a Card while Google data isn't available. */
export function GoogleDataState({
  isPending,
  error,
}: {
  isPending: boolean;
  error: Error | null;
}) {
  if (isPending) {
    return <p className="px-[18px] py-3 text-[14px] text-ink-soft-55">Loading…</p>;
  }

  const code = error instanceof ApiError ? error.code : undefined;
  const fixable = code !== undefined && code in messages;

  return (
    <div className="flex items-center justify-between gap-3 px-[18px] py-3">
      <p className="text-[14px] text-ink-soft-62">
        {fixable ? messages[code] : "Couldn't load this right now."}
      </p>
      {fixable && (
        <a
          href={GOOGLE_RECONNECT_URL}
          className="shrink-0 rounded-pill border border-ink/25 px-3.5 py-1.5 text-[13px] font-semibold text-ink"
        >
          Reconnect
        </a>
      )}
    </div>
  );
}
