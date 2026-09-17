import type { Signal } from './Store';

export function bindText(el: HTMLElement, sig: Signal<string>): void {
  sig.subscribe((v) => { el.textContent = v; }, true);
}

export function bindClass(el: HTMLElement, sig: Signal<boolean>, className: string): void {
  sig.subscribe((v) => el.classList.toggle(className, v), true);
}

/** Two-way bind a numeric <input>: signal->input on external change, input->signal on user edit (not on every keystroke of an in-progress edit by another source). */
export function bindNumberInput(input: HTMLInputElement, sig: Signal<number>, opts: { step?: number } = {}): void {
  if (opts.step !== undefined) input.step = String(opts.step);
  let editing = false;
  sig.subscribe((v) => {
    if (editing) return;
    const formatted = Number.isFinite(v) ? v.toFixed(3) : '0';
    if (input.value !== formatted) input.value = formatted;
  }, true);
  input.addEventListener('focus', () => { editing = true; });
  input.addEventListener('blur', () => { editing = false; });
  input.addEventListener('change', () => {
    const n = parseFloat(input.value);
    if (Number.isFinite(n)) sig.set(n);
  });
}
