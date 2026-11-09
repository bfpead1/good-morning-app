import { useSearchParams } from "react-router-dom";
import { Card, ListRow } from "../components/Card";
import { GoogleIcon, MailIcon, PlanIcon } from "../components/icons";
import { GOOGLE_LOGIN_URL } from "../lib/auth";

const errorMessages: Record<string, string> = {
  access_denied: "Sign-in was cancelled. Try again whenever you're ready.",
  invalid_state: "That sign-in link expired. Please try again.",
  google_error: "Google couldn't complete the sign-in. Please try again.",
  not_allowed: "This Google account doesn't have access to this app.",
};

const permissions = [
  {
    Icon: PlanIcon,
    title: "Google Calendar",
    access: "view & edit events",
    detail: "Build today's schedule, and add or change events when you ask",
  },
  {
    Icon: MailIcon,
    title: "Gmail",
    access: "read-only",
    detail: "Read recent emails to surface what's important",
  },
];

export function Login() {
  const [params] = useSearchParams();
  const errorCode = params.get("error");
  const error = errorCode
    ? (errorMessages[errorCode] ?? errorMessages.google_error)
    : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col justify-center px-6 py-10">
      <header className="mb-8 text-center">
        <img
          src="/logo.jpg"
          alt=""
          className="mx-auto mb-4 h-28 w-28 rounded-[24px] object-cover shadow-sm"
        />
        <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft-55">
          Morning
        </p>
        <h1 className="mt-2 font-display text-[30px] font-medium leading-tight text-ink">
          Good morning.
        </h1>
        <p className="mt-2 text-[15px] text-ink-soft-62">
          Your schedule, inbox and plan for the day, ready when you wake up.
        </p>
      </header>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-button border border-ink/15 bg-card px-4 py-3 text-[14px] text-ink"
        >
          {error}
        </p>
      )}

      <Card className="mb-4">
        <a
          href={GOOGLE_LOGIN_URL}
          className="flex w-full items-center justify-center gap-3 rounded-button bg-ink px-4 py-3.5 text-[15px] font-semibold text-cta-on-ink transition-opacity active:opacity-80"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
            <GoogleIcon width={16} height={16} />
          </span>
          Continue with Google
        </a>
        <p className="mt-3 text-center text-[13px] text-ink-soft-55">
          Signs you in and connects your Google account.
        </p>
      </Card>

      <section>
        <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-ink-soft-55">
          What Morning can see
        </p>
        <Card padded={false}>
          {permissions.map(({ Icon, title, access, detail }, i) => (
            <ListRow key={title} first={i === 0}>
              <Icon width={20} height={20} className="shrink-0 text-ink-soft-62" />
              <div>
                <p className="text-[15px] font-medium text-ink">
                  {title}{" "}
                  <span className="text-[13px] font-normal text-ink-soft-55">
                    · {access}
                  </span>
                </p>
                <p className="text-[13px] text-ink-soft-62">{detail}</p>
              </div>
            </ListRow>
          ))}
        </Card>
        <p className="mt-3 px-1 text-[12.5px] leading-relaxed text-ink-soft-55">
          Morning never sends email, and only changes your calendar when you edit an
          event in the app. You can disconnect anytime from Settings.
        </p>
      </section>
    </div>
  );
}
