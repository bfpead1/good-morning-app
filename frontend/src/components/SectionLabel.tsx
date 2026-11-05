export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-ink-soft-55">
      {children}
    </p>
  );
}
