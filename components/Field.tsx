import type { ReactNode } from 'react';

interface Props {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, children }: Props) {
  return (
    <label className="flex flex-col gap-1.5" htmlFor={htmlFor}>
      <span className="text-sm font-medium text-[var(--ll-ink)]">{label}</span>
      {children}
      {hint ? <span className="text-xs text-[var(--ll-muted)]">{hint}</span> : null}
    </label>
  );
}

export const inputClassName =
  'w-full rounded-md border border-[var(--ll-border)] bg-[var(--ll-bg-elevated)] px-3 py-2 text-sm text-[var(--ll-ink)] outline-none focus:border-[var(--ll-focus)] focus:ring-2 focus:ring-[var(--ll-accent-soft)]';

export const buttonPrimaryClassName =
  'inline-flex items-center justify-center rounded-md bg-[var(--ll-accent)] px-3 py-2 text-sm font-medium text-white outline-none hover:opacity-90 focus:ring-2 focus:ring-[var(--ll-accent-soft)] disabled:opacity-50';

export const buttonSecondaryClassName =
  'inline-flex items-center justify-center rounded-md border border-[var(--ll-border)] bg-[var(--ll-bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--ll-ink)] outline-none hover:bg-[var(--ll-bg)] focus:ring-2 focus:ring-[var(--ll-accent-soft)] disabled:opacity-50';
