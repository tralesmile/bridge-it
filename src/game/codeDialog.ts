/**
 * A small HTML dialog for bridge codes. It replaces window.prompt, which portals (in iframes)
 * and app web views may block. Keys typed in it never reach the game (no undo on Z, no GO on Space).
 */

const STYLE = `
#code-dialog { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; background: rgba(43,33,64,.55); font-family: 'Fredoka Variable', system-ui, sans-serif; }
#code-dialog .box { width: min(92vw, 520px); background: #fff7e8; color: #2b2140; border: 4px solid #2b2140; border-radius: 22px; padding: 20px; box-sizing: border-box; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 8px 0 rgba(0,0,0,.25); }
#code-dialog p { margin: 0; font-size: 24px; font-weight: 700; text-align: center; }
#code-dialog textarea { font: 600 18px/1.3 ui-monospace, monospace; height: 84px; resize: none; border: 3px solid #2b2140; border-radius: 12px; padding: 10px; box-sizing: border-box; background: #fff; color: #2b2140; word-break: break-all; user-select: text; -webkit-user-select: text; }
#code-dialog .row { display: flex; gap: 12px; justify-content: center; }
#code-dialog button { font: 700 22px 'Fredoka Variable', system-ui, sans-serif; color: #fff; border: 0; border-radius: 16px; padding: 10px 26px; cursor: pointer; box-shadow: 0 5px 0 rgba(0,0,0,.25); }
#code-dialog button.ok { background: #3c8dff; }
#code-dialog button.cancel { background: #8a8299; }
`;

export interface CodeDialogOptions {
  title: string;
  /** Text already in the box (for "copy this code"). */
  value?: string;
  /** True: the box is read-only and selected, there is only a Close button. */
  readOnly?: boolean;
  okLabel?: string;
}

let open: HTMLElement | null = null;
let cancelOpen: (() => void) | null = null;

/** True while a code dialog is on screen (the game ignores its own keys then). */
export const codeDialogOpen = (): boolean => open !== null;

/** Closes the dialog as if Cancel was pressed (the Android back button). */
export function closeCodeDialog(): void {
  cancelOpen?.();
}

/** Shows the dialog. Resolves with the text on OK, or null on Cancel, Escape or a click outside. */
export function showCodeDialog(opts: CodeDialogOptions): Promise<string | null> {
  if (!document.getElementById('code-dialog-style')) {
    const style = document.createElement('style');
    style.id = 'code-dialog-style';
    style.textContent = STYLE;
    document.head.appendChild(style);
  }
  cancelOpen?.();

  const root = document.createElement('div');
  root.id = 'code-dialog';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  const box = document.createElement('div');
  box.className = 'box';
  const title = document.createElement('p');
  title.textContent = opts.title;
  const area = document.createElement('textarea');
  area.spellcheck = false;
  area.autocapitalize = 'off';
  area.setAttribute('autocomplete', 'off');
  area.setAttribute('aria-label', opts.title);
  area.value = opts.value ?? '';
  area.readOnly = !!opts.readOnly;
  const row = document.createElement('div');
  row.className = 'row';
  const ok = document.createElement('button');
  ok.className = 'ok';
  ok.type = 'button';
  ok.textContent = opts.okLabel ?? (opts.readOnly ? 'Close' : 'Load');
  const cancel = document.createElement('button');
  cancel.className = 'cancel';
  cancel.type = 'button';
  cancel.textContent = 'Cancel';
  row.append(...(opts.readOnly ? [ok] : [cancel, ok]));
  box.append(title, area, row);
  root.appendChild(box);
  document.body.appendChild(root);
  open = root;

  return new Promise((resolve) => {
    const finish = (value: string | null) => {
      if (open !== root) return;
      root.remove();
      open = null;
      cancelOpen = null;
      resolve(value);
    };
    cancelOpen = () => finish(null);
    ok.addEventListener('click', () => finish(opts.readOnly ? null : area.value.trim()));
    cancel.addEventListener('click', () => finish(null));
    root.addEventListener('pointerdown', (e) => {
      if (e.target === root) finish(null);
    });
    // Keep keys away from the game's window listeners.
    const keys = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.type !== 'keydown') return;
      if (e.key === 'Escape') finish(null);
      else if (e.key === 'Enter' && !opts.readOnly) {
        e.preventDefault();
        finish(area.value.trim());
      }
    };
    for (const type of ['keydown', 'keyup', 'keypress'] as const) root.addEventListener(type, keys);
    area.focus();
    if (opts.readOnly) area.select();
  });
}
