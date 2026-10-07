import { showActionMenu, extractElementText, type ActionMenuHandle, type PickerAction } from './menu';
import { createPickerOverlay, resolveTargetElement, type PickerOverlay } from './overlay';

export interface PickerControllerOptions {
  onPick: (payload: { action: PickerAction; text: string; outerHTMLSnippet: string }) => void;
  onCancel: () => void;
  getActionLabels: () => Record<PickerAction, string>;
  getDir?: () => 'ltr' | 'rtl';
}

export interface PickerController {
  start: () => void;
  stop: () => void;
  readonly active: boolean;
}

export function createPickerController(options: PickerControllerOptions): PickerController {
  let active = false;
  let overlay: PickerOverlay | null = null;
  let menu: ActionMenuHandle | null = null;
  let current: Element | null = null;

  const clearMenu = () => {
    menu?.destroy();
    menu = null;
  };

  const stop = () => {
    if (!active) return;
    active = false;
    clearMenu();
    overlay?.destroy();
    overlay = null;
    current = null;
    window.removeEventListener('mousemove', onMove, true);
    window.removeEventListener('click', onClick, true);
    window.removeEventListener('keydown', onKey, true);
    document.documentElement.style.cursor = '';
  };

  const onMove = (event: MouseEvent) => {
    if (!active || menu) return;
    const el = resolveTargetElement(event);
    current = el;
    overlay?.highlight(el?.getBoundingClientRect() ?? null);
  };

  const onClick = (event: MouseEvent) => {
    if (!active) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (menu) return;

    const el = resolveTargetElement(event) ?? current;
    if (!el) return;

    overlay?.highlight(el.getBoundingClientRect());
    const text = extractElementText(el);
    const snippet = el.outerHTML.slice(0, 2000);

    clearMenu();
    menu = showActionMenu({
      x: event.clientX,
      y: event.clientY,
      labels: options.getActionLabels(),
      dir: options.getDir?.() ?? 'ltr',
      onAction: (action) => {
        clearMenu();
        stop();
        options.onPick({ action, text, outerHTMLSnippet: snippet });
      },
      onDismiss: () => {
        clearMenu();
        // Stay in picker mode so the user can click another element.
      },
    });
  };

  const onKey = (event: KeyboardEvent) => {
    if (!active) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      stop();
      options.onCancel();
      return;
    }
    if (event.altKey && event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      if (current?.parentElement) {
        current = current.parentElement;
        overlay?.highlight(current.getBoundingClientRect());
      }
    }
  };

  return {
    get active() {
      return active;
    },
    start() {
      if (active) return;
      active = true;
      overlay = createPickerOverlay();
      document.documentElement.style.cursor = 'crosshair';
      window.addEventListener('mousemove', onMove, true);
      window.addEventListener('click', onClick, true);
      window.addEventListener('keydown', onKey, true);
    },
    stop,
  };
}
