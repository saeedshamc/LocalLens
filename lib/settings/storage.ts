import {
  DEFAULT_SETTINGS,
  DEFAULT_SYSTEM_PROMPT_CHAT,
  DEFAULT_SYSTEM_PROMPT_TRANSLATE,
} from './defaults';
import type { Settings, SettingsPatch } from './types';

const STORAGE_KEY = 'locallens.settings';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asUiLanguage(value: unknown): Settings['uiLanguage'] {
  return value === 'fa' ? 'fa' : 'en';
}

function asTranslationMode(value: unknown): Settings['translationMode'] {
  return value === 'overlay' ? 'overlay' : 'replace';
}

/** Normalize partial/unknown storage payloads into a full Settings object. */
export function normalizeSettings(raw: unknown): Settings {
  const source = isRecord(raw) ? raw : {};
  return {
    ollamaHost: asString(source.ollamaHost, DEFAULT_SETTINGS.ollamaHost).replace(
      /\/$/,
      '',
    ),
    translateModel: asString(source.translateModel, DEFAULT_SETTINGS.translateModel),
    chatModel: asString(source.chatModel, DEFAULT_SETTINGS.chatModel),
    embeddingModel: asString(source.embeddingModel, DEFAULT_SETTINGS.embeddingModel),
    explainModel: asString(source.explainModel, DEFAULT_SETTINGS.explainModel),
    targetLanguage: asString(source.targetLanguage, DEFAULT_SETTINGS.targetLanguage),
    temperature: asNumber(source.temperature, DEFAULT_SETTINGS.temperature),
    numCtx: Math.max(256, Math.floor(asNumber(source.numCtx, DEFAULT_SETTINGS.numCtx))),
    keepAlive: asString(source.keepAlive, DEFAULT_SETTINGS.keepAlive),
    systemPromptTranslate: asString(
      source.systemPromptTranslate,
      DEFAULT_SYSTEM_PROMPT_TRANSLATE,
    ),
    systemPromptChat: asString(source.systemPromptChat, DEFAULT_SYSTEM_PROMPT_CHAT),
    uiLanguage: asUiLanguage(source.uiLanguage),
    chatHistoryTurns: Math.max(
      0,
      Math.min(20, Math.floor(asNumber(source.chatHistoryTurns, DEFAULT_SETTINGS.chatHistoryTurns))),
    ),
    translationMode: asTranslationMode(source.translationMode),
  };
}

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return normalizeSettings(result[STORAGE_KEY]);
}

export async function saveSettings(patch: SettingsPatch): Promise<Settings> {
  const current = await getSettings();
  const next = normalizeSettings({ ...current, ...patch });
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

export async function resetSystemPrompt(
  which: 'translate' | 'chat',
): Promise<Settings> {
  if (which === 'translate') {
    return saveSettings({ systemPromptTranslate: DEFAULT_SYSTEM_PROMPT_TRANSLATE });
  }
  return saveSettings({ systemPromptChat: DEFAULT_SYSTEM_PROMPT_CHAT });
}

export function onSettingsChanged(
  listener: (settings: Settings) => void,
): () => void {
  const handler = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string,
  ) => {
    if (areaName !== 'local' || !(STORAGE_KEY in changes)) return;
    listener(normalizeSettings(changes[STORAGE_KEY]?.newValue));
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}

export { STORAGE_KEY };
