/**
 * ui/NamePrompt.ts
 *
 * DXB-28: Tiny DOM overlay for editing a short display name. Phaser
 * has no text field; this mounts an HTML input over the canvas so
 * desktop and mobile can type. Not a network form and not an account.
 */

export interface NamePromptOptions {
  title?: string;
  label?: string;
  maxLength?: number;
  accent?: string;
}

export function openNamePrompt(
  current: string,
  onCommit: (next: string) => void,
  options: NamePromptOptions = {},
): void {
  const existing = document.getElementById('arc-name-prompt');
  existing?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'arc-name-prompt';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:9999',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'background:rgba(5,8,20,0.78)',
    'font-family:Trebuchet MS, Segoe UI, sans-serif',
  ].join(';');

  const card = document.createElement('form');
  card.style.cssText = [
    'min-width:min(86vw, 360px)',
    'padding:22px 20px 18px',
    'border-radius:12px',
    'background:#12182c',
    `border:1.5px solid ${options.accent ?? '#2de2e6'}`,
    'box-shadow:0 12px 40px rgba(0,0,0,0.45)',
    'color:#f8f9fa',
  ].join(';');

  const title = document.createElement('div');
  title.textContent = options.title ?? 'PLAYER NAME';
  title.style.cssText = 'font-size:13px;letter-spacing:0.08em;font-weight:700;color:#90e0ef;margin-bottom:8px;';

  const label = document.createElement('label');
  label.textContent = options.label ?? 'Name';
  label.style.cssText = 'display:block;font-size:12px;color:#c5d0dc;margin-bottom:8px;';

  const input = document.createElement('input');
  input.type = 'text';
  input.value = current;
  input.maxLength = options.maxLength ?? 16;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.style.cssText = [
    'width:100%',
    'box-sizing:border-box',
    'padding:10px 12px',
    'border-radius:8px',
    'border:1px solid #2de2e6',
    'background:#0b1320',
    'color:#f8f9fa',
    'font:inherit',
    'font-size:16px',
    'outline:none',
  ].join(';');
  input.addEventListener('keydown', (event) => {
    event.stopPropagation();
  });

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;justify-content:flex-end;gap:12px;margin-top:16px;';

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'Cancel';
  cancel.style.cssText = buttonStyle('#c5d0dc', 'transparent');

  const save = document.createElement('button');
  save.type = 'submit';
  save.textContent = 'Save';
  save.style.cssText = buttonStyle('#0b1320', options.accent ?? '#2de2e6');

  const close = (): void => {
    overlay.remove();
  };

  cancel.addEventListener('click', () => close());
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      close();
    }
  });
  card.addEventListener('submit', (event) => {
    event.preventDefault();
    onCommit(input.value);
    close();
  });

  actions.append(cancel, save);
  card.append(title, label, input, actions);
  overlay.append(card);
  document.body.append(overlay);
  input.focus();
  input.select();
}

function buttonStyle(color: string, background: string): string {
  return [
    'min-width:88px',
    'padding:8px 14px',
    'border-radius:8px',
    `border:1px solid ${background === 'transparent' ? '#6c7a89' : background}`,
    `background:${background}`,
    `color:${color}`,
    'font:inherit',
    'font-weight:700',
    'cursor:pointer',
  ].join(';');
}
