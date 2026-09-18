import type { ReferenceImageManager } from '../ReferenceImageManager';
import type { Vec3, Quat } from '../../core/types';
import type { Command } from './Command';

export interface ReferenceImageTransform {
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
}

/** Mirrors TransformCommand but for a single reference image with a Quaternion rotation — read
 * directly off the gizmo's Object3D.quaternion, never decomposed to/from Euler. */
export class TransformReferenceImageCommand implements Command {
  constructor(
    private referenceImages: ReferenceImageManager,
    private id: string,
    private before: ReferenceImageTransform,
    private after: ReferenceImageTransform,
    private label: string,
  ) {}

  execute(): void {
    this.referenceImages.update(this.id, { ...this.after });
  }

  undo(): void {
    this.referenceImages.update(this.id, { ...this.before });
  }

  describe(): string {
    return this.label;
  }
}
