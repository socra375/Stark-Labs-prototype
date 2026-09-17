import type * as THREE from 'three';

/** Only ONE_IMAGE is wired to a real engine in this build. The other three are real, present,
 * disabled UI options ("Coming Soon") — never hidden, never faked. */
export type ReconstructionMode = 'ONE_IMAGE' | 'TWO_IMAGES' | 'FOUR_IMAGES' | 'MULTI_VIEW';

export interface ReconstructionInput {
  mode: ReconstructionMode;
  images: File[];
}

/** Non-mutating preview output — nothing here touches AssetManager/ObjectManager. The live scene
 * stays untouched until a separate commit step (App.commitReconstruction) applies the result. */
export interface ReconstructionPreview {
  width: number;
  height: number;
  originalImageData: ImageData;
  silhouetteImageData: ImageData;
  depthImageData: ImageData;
  /** Flat xyz positions (world-space-ish, centered at origin) for a cheap THREE.Points preview. */
  points: Float32Array;
}

/** Future-proofing only — always undefined for this MVP engine. A future smarter engine could
 * populate this with real per-part results (Helmet/Chest/Arm/...) without ImageTo3DWorkspace's
 * consumption code changing, just a new render branch added later. */
export interface ReconstructionComponent {
  id: string;
  name: string;
  geometryAssetId: string;
  confidence?: number;
  estimated: true;
}

export interface ReconstructionResult {
  geometry: THREE.BufferGeometry;
  method: string;
  componentDetection: 'single-object';
  components?: ReconstructionComponent[];
}

/** Mirrors AIProvider's id/label/available shape so ReconstructionService can swap engines the
 * same way AIService swaps providers. */
export interface ReconstructionEngine {
  readonly id: string;
  readonly label: string;
  readonly available: boolean;
  readonly supportedModes: ReconstructionMode[];
  preview(input: ReconstructionInput): Promise<ReconstructionPreview>;
  generate(input: ReconstructionInput): Promise<ReconstructionResult>;
}
