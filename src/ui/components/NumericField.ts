import type { Signal } from '../reactive/Store';
import { bindNumberInput } from '../reactive/bind';

export function createNumericField(label: string, sig: Signal<number>, step = 0.1): HTMLElement {
  const row = document.createElement('label');
  row.className = 'numeric-field';
  const span = document.createElement('span');
  span.className = 'numeric-field-label';
  span.textContent = label;
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'numeric-field-input mono';
  bindNumberInput(input, sig, { step });
  row.appendChild(span);
  row.appendChild(input);
  return row;
}
