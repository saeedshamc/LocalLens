const RTL_LANG_CODES = new Set([
  'ar',
  'fa',
  'he',
  'ur',
  'ps',
  'sd',
  'yi',
  'dv',
  'ku',
  'ckb',
]);

/** Returns true when the BCP-47 / ISO language code is typically RTL. */
export function isRtlLanguage(lang: string): boolean {
  const primary = lang.trim().toLowerCase().split(/[-_]/)[0] ?? '';
  return RTL_LANG_CODES.has(primary);
}
