const TOKEN_RE =
  /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(`[^`]+`)|(\b\d+(?:[.,]\d+)?%?\b)/g;

export interface PlaceholderResult {
  masked: string;
  restore: (translated: string) => string;
}

/**
 * Replace URLs, emails, inline code, and numbers with stable tokens so the
 * model is less likely to alter them. Tokens are put back after translation.
 */
export function protectPlaceholders(text: string): PlaceholderResult {
  const saved: string[] = [];
  const masked = text.replace(TOKEN_RE, (match) => {
    const index = saved.length;
    saved.push(match);
    return `⟦PH${index}⟧`;
  });

  return {
    masked,
    restore: (translated: string) =>
      translated.replace(/⟦PH(\d+)⟧/g, (_full, num: string) => {
        const idx = Number(num);
        return saved[idx] ?? _full;
      }),
  };
}
