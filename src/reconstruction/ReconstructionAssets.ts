import type { AssetRecord } from '../core/types';
import { generateId } from '../utils/ids';
import { arrayBufferToBase64 } from '../3d/AssetManager';

/** Pure literal builder for the uploaded source-image AssetRecord — mirrors
 * AssetManager.insertSourceImage's body but with a caller-visible record and no live-manager
 * mutation, since App.commitReconstruction builds this before ReconstructionCommitCommand exists
 * (same reasoning as src/3d/import/ImportShared.ts's toGeometryAssetRecord for M15 Import: keep
 * the preview stage side-effect-free, apply everything atomically through one Command). */
export function toSourceImageAssetRecord(buf: ArrayBuffer, mimeType: string, name: string): AssetRecord {
  return {
    id: generateId('asset'),
    kind: 'sourceImage',
    mimeType,
    name,
    data: arrayBufferToBase64(buf),
    createdAt: new Date().toISOString(),
  };
}
