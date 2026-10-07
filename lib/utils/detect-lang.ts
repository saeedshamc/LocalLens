export type ScriptGuess = 'fa' | 'ar' | 'en' | 'unknown';

const ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g;
const LATIN = /[A-Za-z]/g;

/** Heuristic script detection from a text sample (no network). */
export function detectPrimaryScript(text: string): ScriptGuess {
  const sample = text.slice(0, 4000);
  const arabic = sample.match(ARABIC_SCRIPT)?.length ?? 0;
  const latin = sample.match(LATIN)?.length ?? 0;
  const total = arabic + latin;
  if (total < 20) return 'unknown';

  if (arabic / total >= 0.55) {
    // Persian uses Arabic script; treat as fa when target checks use fa/ar family.
    return 'fa';
  }
  if (latin / total >= 0.55) return 'en';
  return 'unknown';
}

/** True when detected page language likely already matches the translation target. */
export function looksLikeTargetLanguage(
  pageText: string,
  targetLanguage: string,
): boolean {
  const primary = (targetLanguage.split(/[-_]/)[0] ?? '').toLowerCase();
  const guess = detectPrimaryScript(pageText);
  if (guess === 'unknown') return false;
  if (primary === 'fa' || primary === 'ar' || primary === 'ur' || primary === 'he') {
    return guess === 'fa' || guess === 'ar';
  }
  if (primary === 'en' || primary === 'de' || primary === 'fr' || primary === 'es') {
    return guess === 'en';
  }
  return false;
}
