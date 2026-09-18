import type { ReferenceImageManager } from '../ReferenceImageManager';
import type { AssetManager } from '../../3d/AssetManager';
import type { ReferenceImage, AssetRecord } from '../../core/types';
import type { Command } from './Command';

/** Owns the source-image AssetRecord + ReferenceImage lifecycle together — identical shape to
 * ImportCommand/ReconstructionCommitCommand. */
export class CreateReferenceImageCommand implements Command {
  constructor(
    private referenceImages: ReferenceImageManager,
    private assets: AssetManager,
    private imageAsset: AssetRecord,
    private referenceImage: ReferenceImage,
  ) {}

  execute(): void {
    this.assets.insert(structuredClone(this.imageAsset));
    this.referenceImages.insert(structuredClone(this.referenceImage));
  }

  undo(): void {
    this.referenceImages.remove(this.referenceImage.id);
    this.assets.remove(this.imageAsset.id);
  }

  describe(): string {
    return `Added reference image "${this.referenceImage.name}"`;
  }
}
