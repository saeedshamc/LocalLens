export interface SpeakOptions {
  text: string;
  lang: string;
  rate?: number;
  pitch?: number;
}

/**
 * Speak via chrome.tts (system voices — local on Windows/macOS/Linux where available).
 * Falls back to window.speechSynthesis when chrome.tts is missing (e.g. some Firefox builds).
 */
export function speakText(options: SpeakOptions): Promise<void> {
  const text = options.text.trim().slice(0, 32_000);
  if (!text) return Promise.resolve();

  const rate = Math.min(2, Math.max(0.5, options.rate ?? 1));
  const pitch = Math.min(2, Math.max(0, options.pitch ?? 1));

  if (typeof chrome !== 'undefined' && chrome.tts?.speak) {
    return new Promise((resolve, reject) => {
      chrome.tts.stop();
      chrome.tts.speak(text, {
        lang: options.lang,
        rate,
        pitch,
        enqueue: false,
        onEvent: (event) => {
          if (event.type === 'end' || event.type === 'cancelled') resolve();
          if (event.type === 'error') {
            reject(new Error(event.errorMessage || 'TTS failed.'));
          }
        },
      });
    });
  }

  if (typeof speechSynthesis !== 'undefined') {
    return new Promise((resolve, reject) => {
      speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = options.lang;
      utter.rate = rate;
      utter.pitch = pitch;
      utter.onend = () => resolve();
      utter.onerror = () => reject(new Error('TTS failed.'));
      speechSynthesis.speak(utter);
    });
  }

  return Promise.reject(new Error('Text-to-speech is not available in this browser.'));
}

export function stopSpeaking(): void {
  if (typeof chrome !== 'undefined' && chrome.tts?.stop) {
    chrome.tts.stop();
  }
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.cancel();
  }
}
