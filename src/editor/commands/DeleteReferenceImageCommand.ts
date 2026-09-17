import type { ReferenceImageManager } from '../ReferenceImageManager';
import type { AssetManager } from '../../3d/AssetManager';
import type { ReferenceImage, AssetRecord } from '../../core/types';
import type { Command } from './Command';

/** Snapshot-based like DisconnectCommand, but symmetric with CreateReferenceImageCommand: owns
 * the underlying image asset too, so deleting a reference image never leaves an orphaned asset. */
export class DeleteReferenceImageCommand implements Command {
  private refSnapshot: ReferenceImage;
  private assetSnapshot: AssetRecord;

  constructor(private referenceImages: ReferenceImageManager, private assets: AssetManager, id: string) {
    this.refSnapshot = structuredClone(referenceImages.get(id)!);
    this.assetSnapshot = structuredClone(assets.get(this.refSnapshot.assetId)!);
  }

  execute(): void {
    this.referenceImages.remove(this.refSnapshot.id);
    this.assets.remove(this.assetSnapshot.id);
  }

  undo(): void {
    this.assets.insert(structuredClone(this.assetSnapshot));
    this.referenceImages.insert(structuredClone(this.refSnapshot));
  }

  describe(): string {
    return `Deleted reference image "${this.refSnapshot.name}"`;
  }
}
