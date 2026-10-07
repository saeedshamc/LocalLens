export interface PickerOverlay {
  highlight: (rect: DOMRect | null) => void;
  destroy: () => void;
}

/** Full-page highlight box with pointer-events: none so the page still receives hits. */
export function createPickerOverlay(root: HTMLElement = document.documentElement): PickerOverlay {
  const host = document.createElement('div');
  host.id = 'locallens-picker-root';
  host.style.cssText =
    'all: initial; position: fixed; inset: 0; z-index: 2147483646; pointer-events: none;';
  const shadow = host.attachShadow({ mode: 'closed' });
  const box = document.createElement('div');
  box.style.cssText = [
    'position: fixed',
    'display: none',
    'pointer-events: none',
    'box-sizing: border-box',
    'border: 2px solid #0f6e56',
    'background: rgba(15, 110, 86, 0.12)',
    'border-radius: 2px',
    'z-index: 1',
  ].join(';');
  shadow.appendChild(box);
  root.appendChild(host);

  return {
    highlight(rect) {
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        box.style.display = 'none';
        return;
      }
      box.style.display = 'block';
      box.style.top = `${rect.top}px`;
      box.style.left = `${rect.left}px`;
      box.style.width = `${rect.width}px`;
      box.style.height = `${rect.height}px`;
    },
    destroy() {
      host.remove();
    },
  };
}

function isDomElement(value: unknown): value is Element {
  return typeof Element !== 'undefined' && value instanceof Element;
}

export function resolveTargetElement(event: Event): Element | null {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  for (const entry of path) {
    if (!isDomElement(entry)) continue;
    if (entry.id === 'locallens-picker-root') continue;
    if (entry.closest?.('#locallens-picker-root')) continue;
    return entry;
  }
  const target = event.target;
  return isDomElement(target) ? target : null;
}

