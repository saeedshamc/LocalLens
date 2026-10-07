import type { ReactNode } from 'react';
import type { UiLanguage } from '../lib/settings/types';
import { isRtlLanguage } from '../lib/utils/rtl';

interface Props {
  uiLanguage: UiLanguage;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function PageShell({ uiLanguage, title, children, actions }: Props) {
  const dir = isRtlLanguage(uiLanguage) ? 'rtl' : 'ltr';

  return (
    <div dir={dir} className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--ll-border)] pb-4">
        <div>
          <p className="m-0 text-sm font-semibold tracking-wide text-[var(--ll-accent)]">
            LocalLens
          </p>
          <h1 className="m-0 mt-1 text-2xl font-semibold text-[var(--ll-ink)]">{title}</h1>
        </div>
        {actions}
      </header>
      <main className="flex flex-col gap-6">{children}</main>
    </div>
  );
}
