import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-card border border-card-border bg-card ${
        padded ? "p-[18px]" : "py-1.5"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function ListRow({
  children,
  className = "",
  first = false,
}: {
  children: ReactNode;
  className?: string;
  first?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-[18px] py-3 ${
        first ? "" : "border-t border-divider"
      } ${className}`}
    >
      {children}
    </div>
  );
}
