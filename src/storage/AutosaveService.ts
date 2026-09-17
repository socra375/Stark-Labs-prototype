import type { EventBus } from '../core/EventBus';
import type { ProjectRepository, LiveScene } from './ProjectRepository';
import { debounce } from '../utils/debounce';

const AUTOSAVE_DELAY_MS = 2000;

/**
 * Debounced autosave: listens for 'project:dirty' (emitted on every model mutation) and writes
 * to IndexedDB at most once per idle window, never on every individual mouse-drag tick. Because
 * every edit ends up durably saved within a couple of seconds, "crash recovery" doesn't need a
 * separate buffer — ProjectRepository.list() sorted by updatedAt (the Landing screen's Recent
 * Projects list) already surfaces the last-edited project as the most recent entry.
 */
export class AutosaveService {
  private debouncedSave: () => void;
  private enabled = true;

  constructor(private bus: EventBus, private repo: ProjectRepository, private scene: LiveScene) {
    this.debouncedSave = debounce(() => this.flush(), AUTOSAVE_DELAY_MS);
    this.bus.on('project:dirty', () => {
      if (this.enabled && this.scene.state.currentProject.get()) this.debouncedSave();
    });
  }

  private async flush(): Promise<void> {
    if (!this.scene.state.currentProject.get()) return;
    try {
      await this.repo.save(this.scene);
    } catch (err) {
      console.error('Autosave failed:', err);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}
