import type { Settings } from './types';

/** Prefer dedicated translate model; fall back to chat/explain so picker/page translate still works. */
export function resolveTranslateModel(settings: Settings): string {
  return (
    settings.translateModel.trim() ||
    settings.chatModel.trim() ||
    settings.explainModel.trim()
  );
}

/** Prefer chat model; fall back to translate/explain. */
export function resolveChatModel(settings: Settings): string {
  return (
    settings.chatModel.trim() ||
    settings.translateModel.trim() ||
    settings.explainModel.trim()
  );
}
