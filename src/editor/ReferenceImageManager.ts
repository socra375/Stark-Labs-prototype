import type { EventBus } from '../core/EventBus';
import type { ReferenceImage } from '../core/types';

/**
 * Owns ReferenceImage records — deliberately NOT SceneObjects, never touched by
 * Join/Separate/Mirror/AnalysisEngine. A parallel per-project collection with the same
 * CRUD/event shape as AssemblyManager: a Map-backed store emitting EventBus events that
 * ReferenceImageVisualizer listens to for mounting/updating/unmounting the viewport plane.
 */
export class ReferenceImageManager {
  private images = new Map<string, ReferenceImage>();

  constructor(private bus: EventBus) {}

  insert(referenceImage: ReferenceImage): void {
    this.images.set(referenceImage.id, referenceImage);
    this.bus.emit('referenceImage:created', { referenceImage });
    this.bus.emit('project:dirty', {});
  }

  update(id: string, patch: Partial<ReferenceImage>): void {
    const referenceImage = this.images.get(id);
    if (!referenceImage) return;
    Object.assign(referenceImage, patch);
    this.bus.emit('referenceImage:updated', { referenceImage });
    this.bus.emit('project:dirty', {});
  }

  remove(id: string): void {
    if (!this.images.delete(id)) return;
    this.bus.emit('referenceImage:removed', { referenceImageId: id });
    this.bus.emit('project:dirty', {});
  }

  get(id: string): ReferenceImage | undefined {
    return this.images.get(id);
  }

  getAll(): ReferenceImage[] {
    return [...this.images.values()];
  }

  clear(): void {
    this.images.clear();
  }

  loadAll(images: ReferenceImage[]): void {
    this.clear();
    for (const img of images) this.images.set(img.id, { ...img });
  }

  serialize(): ReferenceImage[] {
    return this.getAll().map((img) => ({ ...img }));
  }
}
