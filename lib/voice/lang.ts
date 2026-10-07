/** Map UI / target language codes to BCP-47 tags for TTS and STT. */
export function toSpeechLocale(lang: string): string {
  const code = lang.trim().toLowerCase().split(/[-_]/)[0] ?? 'en';
  const map: Record<string, string> = {
    fa: 'fa-IR',
    en: 'en-US',
    ar: 'ar-SA',
    de: 'de-DE',
    es: 'es-ES',
    fr: 'fr-FR',
    tr: 'tr-TR',
    zh: 'zh-CN',
  };
  return map[code] ?? (code.length === 2 ? `${code}-${code.toUpperCase()}` : lang);
}

/** Prefer target language for reading translations; fall back to UI language. */
export function speechLocaleForRead(opts: {
  preferTarget: boolean;
  targetLanguage: string;
  uiLanguage: string;
}): string {
  return toSpeechLocale(
    opts.preferTarget ? opts.targetLanguage : opts.uiLanguage,
  );
}
