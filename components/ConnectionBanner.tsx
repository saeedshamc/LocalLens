import type { ConnectionResult } from '../lib/ollama/types';
import type { UiLanguage } from '../lib/settings/types';
import { t } from '../lib/i18n';

interface Props {
  result: ConnectionResult | null;
  uiLanguage: UiLanguage;
  busy?: boolean;
}

export function ConnectionBanner({ result, uiLanguage, busy }: Props) {
  if (busy) {
    return (
      <div
        className="rounded-md border border-[var(--ll-border)] bg-white px-3 py-2 text-sm text-[var(--ll-muted)]"
        role="status"
      >
        {t(uiLanguage, 'testing')}
      </div>
    );
  }

  if (!result) return null;

  if (result.ok) {
    return (
      <div
        className="rounded-md border border-transparent bg-[var(--ll-accent-soft)] px-3 py-2 text-sm text-[var(--ll-accent)]"
        role="status"
      >
        {t(uiLanguage, 'connectionOk', { count: result.models.length })}
      </div>
    );
  }

  const soft =
    result.kind === 'cors'
      ? 'bg-[var(--ll-warning-soft)] text-[var(--ll-warning)]'
      : 'bg-[var(--ll-danger-soft)] text-[var(--ll-danger)]';

  const kindLabel =
    result.kind === 'cors'
      ? t(uiLanguage, 'connectionKindCors')
      : result.kind === 'offline'
        ? t(uiLanguage, 'connectionKindOffline')
        : t(uiLanguage, 'connectionKindHttp');

  const message =
    result.kind === 'cors'
      ? t(uiLanguage, 'connectionCors')
      : result.kind === 'offline'
        ? t(uiLanguage, 'connectionOffline')
        : t(uiLanguage, 'connectionHttp', { status: result.status });

  return (
    <div className={`rounded-md border border-transparent px-3 py-2 text-sm ${soft}`} role="alert">
      <p className="m-0 font-medium tracking-wide opacity-80">{kindLabel}</p>
      <p className="m-0 mt-1">{message}</p>
    </div>
  );
}
