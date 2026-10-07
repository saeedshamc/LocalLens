export type PickerAction =
  | 'translate'
  | 'explain'
  | 'summarize'
  | 'ask'
  | 'read'
  | 'translateRead';

export interface ActionMenuOptions {
  x: number;
  y: number;
  labels: Record<PickerAction, string>;
  dir?: 'ltr' | 'rtl';
  onAction: (action: PickerAction) => void;
  onDismiss: () => void;
}

export interface ActionMenuHandle {
  destroy: () => void;
}

const ACTION_IDS: PickerAction[] = [
  'translate',
  'explain',
  'summarize',
  'ask',
  'read',
  'translateRead',
];

/** Shadow-DOM action menu so host page CSS cannot break layout. */
export function showActionMenu(options: ActionMenuOptions): ActionMenuHandle {
  const host = document.createElement('div');
  host.id = 'locallens-action-menu';
  host.style.cssText =
    'all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;';
  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    .menu {
      position: fixed;
      min-width: 180px;
      pointer-events: auto;
      background: #fffaf3;
      color: #1a1f2b;
      border: 1px solid #d8d3c8;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(26, 31, 43, 0.16);
      font: 13px/1.4 "Segoe UI", Tahoma, sans-serif;
      padding: 4px;
    }
    button {
      display: block;
      width: 100%;
      text-align: start;
      border: 0;
      background: transparent;
      padding: 8px 10px;
      border-radius: 6px;
      cursor: pointer;
      color: inherit;
      font: inherit;
    }
    button:hover, button:focus-visible {
      background: #d8efe6;
      outline: none;
    }
  `;

  const menu = document.createElement('div');
  menu.className = 'menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('dir', options.dir ?? 'ltr');

  for (const id of ACTION_IDS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'menuitem');
    button.textContent = options.labels[id];
    // Use pointerup so the picker's capture-phase click handler cannot
    // race ahead of the menu action (also works for mouse + pen).
    button.addEventListener('pointerup', (event) => {
      event.preventDefault();
      event.stopPropagation();
      options.onAction(id);
    });
    button.addEventListener('click', (event) => {
      // Prevent host-page navigation/activation if the click still bubbles.
      event.preventDefault();
      event.stopPropagation();
    });
    menu.appendChild(button);
  }

  shadow.append(style, menu);
  document.documentElement.appendChild(host);

  const left = Math.min(options.x, window.innerWidth - 200);
  const top = Math.min(options.y, window.innerHeight - 280);
  menu.style.left = `${Math.max(8, left)}px`;
  menu.style.top = `${Math.max(8, top)}px`;

  const onPointerDown = (event: MouseEvent) => {
    const path = event.composedPath();
    if (path.includes(menu) || path.includes(host)) return;
    options.onDismiss();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      options.onDismiss();
    }
  };

  // Capture so page handlers do not steal Esc / outside click first.
  window.addEventListener('mousedown', onPointerDown, true);
  window.addEventListener('keydown', onKeyDown, true);

  return {
    destroy() {
      window.removeEventListener('mousedown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
      host.remove();
    },
  };
}

export function extractElementText(el: Element): string {
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  return text;
}
