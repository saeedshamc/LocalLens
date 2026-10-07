type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionAvailable(): boolean {
  return getRecognitionCtor() !== null;
}

export interface ListenOnceOptions {
  lang: string;
  /** Max listen time before auto-stop (ms). */
  timeoutMs?: number;
}

export interface ListenOnceResult {
  transcript: string;
}

/**
 * One-shot browser speech recognition (Chromium Web Speech API).
 * Note: Chrome may send audio to Google for recognition — see privacy docs.
 */
export function listenOnce(options: ListenOnceOptions): Promise<ListenOnceResult> {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    return Promise.reject(new Error('Speech recognition is not available in this browser.'));
  }

  return new Promise((resolve, reject) => {
    const recognition = new Ctor();
    recognition.lang = options.lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let settled = false;
    const timeout = window.setTimeout(
      () => {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
        if (!settled) {
          settled = true;
          reject(new Error('Listening timed out. Try again.'));
        }
      },
      options.timeoutMs ?? 15_000,
    );

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      fn();
    };

    recognition.onresult = (event) => {
      const first = event.results[0]?.[0]?.transcript?.trim() ?? '';
      finish(() => {
        if (!first) reject(new Error('No speech detected.'));
        else resolve({ transcript: first });
      });
    };

    recognition.onerror = (event) => {
      finish(() => {
        if (event.error === 'aborted' || event.error === 'no-speech') {
          reject(new Error('No speech detected.'));
        } else if (event.error === 'not-allowed') {
          reject(new Error('Microphone permission denied.'));
        } else {
          reject(new Error(`Speech recognition error: ${event.error}`));
        }
      });
    };

    recognition.onend = () => {
      finish(() => reject(new Error('No speech detected.')));
    };

    try {
      recognition.start();
    } catch (error) {
      finish(() =>
        reject(error instanceof Error ? error : new Error('Could not start listening.')),
      );
    }
  });
}
