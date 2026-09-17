import type { EventBus } from '../core/EventBus';
import type { AppState } from '../core/AppState';
import type { ObjectManager } from '../core/ObjectManager';

/** Single/multi selection over SceneObject ids, driven by click + Shift/Ctrl modifiers. */
export class SelectionManager {
  constructor(private bus: EventBus, private state: AppState, private objects: ObjectManager) {}

  get current(): string[] {
    return this.state.selection.get();
  }

  selectOnly(id: string | null): void {
    const next = id ? [id] : [];
    this.set(next);
  }

  toggle(id: string): void {
    const cur = this.current;
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    this.set(next);
  }

  addRange(id: string): void {
    // Range-select falls back to simple additive toggle: exact ordered-range semantics
    // need a stable visible-list order (ObjectTree), applied there via selectRangeTo().
    this.toggle(id);
  }

  handlePointerPick(id: string | null, modifiers: { shift: boolean; ctrl: boolean }): void {
    if (!id) {
      if (!modifiers.shift && !modifiers.ctrl) this.set([]);
      return;
    }
    const obj = this.objects.get(id);
    if (obj?.locked) return;
    if (modifiers.shift || modifiers.ctrl) this.toggle(id);
    else this.selectOnly(id);
  }

  clear(): void {
    this.set([]);
  }

  set(ids: string[]): void {
    const deduped = [...new Set(ids)];
    this.state.selection.set(deduped);
    this.bus.emit('selection:changed', { objectIds: deduped });
  }
}
