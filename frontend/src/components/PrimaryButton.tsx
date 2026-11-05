import type { ButtonHTMLAttributes } from "react";

export function PrimaryButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`w-full rounded-button bg-ink px-4 py-3.5 text-[15px] font-semibold text-cta-on-ink transition-opacity active:opacity-80 ${className}`}
      {...props}
    />
  );
}

export function SecondaryButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`w-full rounded-button border border-ink/25 bg-transparent px-4 py-3.5 text-[15px] font-semibold text-ink transition-opacity active:opacity-70 ${className}`}
      {...props}
    />
  );
}
