import { Link } from "react-router-dom";
import { PrimaryButton } from "../components/PrimaryButton";
import { ArrowLeftIcon } from "../components/icons";
import { ApiError } from "../lib/api";
import { aiMessage, type BlockType, formatClock, useGeneratePlan, useTodayPlan } from "../lib/plan";
import { useSettings } from "../lib/settings";

const blockStyles: Record<BlockType, string> = {
  class: "bg-card border border-ink/30 text-ink",
  task: "bg-ink text-cta-on-ink",
  workout: "bg-accent text-ink",
  study: "bg-accent text-ink",
  break: "bg-card/60 border border-dashed border-card-border text-ink-soft-62",
};

const typeLabels: Record<BlockType, string> = {
  class: "Class",
  task: "Task",
  workout: "Workout",
  study: "Study",
  break: "Break",
};

export function Plan() {
  const settings = useSettings();
  const aiEnabled = settings.data?.features.ai ?? false;
  const today = useTodayPlan();
  const generate = useGeneratePlan();
  const data = today.data?.plan;
  const plannedMinutes = data?.priorities.reduce((n, p) => n + p.estimated_minutes, 0) ?? 0;

  return (
    <div className="px-6 pb-28 pt-7">
      <header className="mb-5 flex items-center gap-3">
        <Link
          to="/"
          aria-label="Back to Home"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-card-border bg-card text-ink"
        >
          <ArrowLeftIcon width={18} height={18} />
        </Link>
        <div>
          <h1 className="font-display text-[22px] font-medium text-ink">Today's plan</h1>
          <p className="text-[13px] text-ink-soft-55">
            {data
              ? `${data.priorities.length} priorities · about ${Math.round(plannedMinutes / 6) / 10} hours of focused work`
              : "Built from your calendar and inbox"}
          </p>
        </div>
      </header>

      {generate.isError && (
        <Notice>
          {aiMessage(generate.error)}
          {data && " Showing the plan you already had."}
        </Notice>
      )}

      {settings.data && !aiEnabled ? (
        <Notice>{aiMessage(new ApiError(503, "ai_not_configured"))}</Notice>
      ) : generate.isPending ? (
        <Notice>Planning your day… this usually takes 5–30 seconds.</Notice>
      ) : today.isPending ? (
        <Notice>Loading…</Notice>
      ) : today.isError ? (
        <Notice>Couldn't load today's plan.</Notice>
      ) : !data ? (
        !generate.isError && (
          <Notice>No plan yet today. It's made automatically each morning, or tap the button below.</Notice>
        )
      ) : (
        <>
          {data.note && (
            <section className="mb-6 rounded-card border border-card-border bg-card p-[18px]">
              <p className="text-[14.5px] leading-relaxed text-ink">{data.note}</p>
            </section>
          )}

          <section className="mb-4">
            <ol className="relative space-y-4 border-l border-divider pl-5">
              {data.time_blocks.map((block) => (
                <li key={`${block.start}-${block.label}`} className="relative">
                  <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-page bg-accent" />
                  <p className="mb-1.5 flex justify-between text-[12.5px] font-medium text-ink-soft-55">
                    <span>
                      {formatClock(block.start)} – {formatClock(block.end)}
                    </span>
                    <span>{typeLabels[block.type]}</span>
                  </p>
                  <div className={`rounded-2xl px-4 py-3.5 text-[15px] font-medium ${blockStyles[block.type]}`}>
                    {block.label}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {today.data && (
            <p className="text-center text-[12px] text-ink-soft-42">
              Generated {new Date(today.data.generatedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </p>
          )}
        </>
      )}

      {aiEnabled && (
        <div className="fixed inset-x-0 bottom-16 z-10 mx-auto max-w-[480px] md:bottom-0 md:left-[232px] md:max-w-[720px] md:border-x md:rounded-t-[16px] border-t border-card-border bg-page/95 px-6 py-4 backdrop-blur">
          <PrimaryButton onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending
              ? "Planning…"
              : generate.isError
                ? "Retry"
                : data
                  ? "Regenerate"
                  : "Plan my day"}
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-5 rounded-card border border-card-border bg-card p-[18px] text-[14px] leading-relaxed text-ink-soft-62">
      {children}
    </p>
  );
}
