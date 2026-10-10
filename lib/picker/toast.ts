/** Lightweight in-page toast so picker actions give feedback without opening the side panel. */
export function showPageToast(
  message: string,
  tone: 'info' | 'error' = 'info',
): void {
  const existing = document.getElementById('locallens-toast');
  existing?.remove();

  const host = document.createElement('div');
  host.id = 'locallens-toast';
  host.style.cssText =
    'all: initial; position: fixed; z-index: 2147483646; inset: auto 16px 16px auto; pointer-events: none;';
  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    .toast {
      max-width: min(360px, 90vw);
      padding: 12px 14px;
      border-radius: 10px;
      font: 13px/1.45 "Segoe UI", Tahoma, sans-serif;
      color: #1a1f2b;
      background: ${tone === 'error' ? '#fde8e8' : '#d8efe6'};
      border: 1px solid ${tone === 'error' ? '#e8b4b4' : '#9bc9b8'};
      box-shadow: 0 10px 28px rgba(26, 31, 43, 0.18);
      pointer-events: auto;
    }
  `;
  const box = document.createElement('div');
  box.className = 'toast';
  box.setAttribute('role', 'status');
  box.textContent = message;
  shadow.append(style, box);
  document.documentElement.appendChild(host);

  window.setTimeout(() => {
    host.remove();
  }, 4500);
}
