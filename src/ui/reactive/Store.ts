export type Unsubscribe = () => void;

/** Minimal signal/computed/effect primitives — no framework, direct DOM/Three.js mutation stays in control. */
export class Signal<T> {
  private value: T;
  private subs = new Set<(v: T) => void>();

  constructor(initial: T) {
    this.value = initial;
  }

  get(): T {
    return this.value;
  }

  set(next: T): void {
    if (this.value === next) return;
    this.value = next;
    for (const fn of [...this.subs]) fn(this.value);
  }

  update(fn: (v: T) => T): void {
    this.set(fn(this.value));
  }

  subscribe(fn: (v: T) => void, immediate = false): Unsubscribe {
    this.subs.add(fn);
    if (immediate) fn(this.value);
    return () => this.subs.delete(fn);
  }
}

export function signal<T>(initial: T): Signal<T> {
  return new Signal(initial);
}

export function computed<A, R>(source: Signal<A>, fn: (a: A) => R): Signal<R> {
  const out = new Signal(fn(source.get()));
  source.subscribe((v) => out.set(fn(v)));
  return out;
}

export function effect<T>(source: Signal<T>, fn: (v: T) => void): Unsubscribe {
  fn(source.get());
  return source.subscribe(fn);
}
