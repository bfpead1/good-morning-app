export function Placeholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
      <h1 className="font-display text-[22px] font-medium text-ink">
        {title}
      </h1>
      <p className="mt-2 text-[14px] text-ink-soft-62">{description}</p>
    </div>
  );
}
