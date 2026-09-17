export type Vec3 = [number, number, number];
/** x, y, z, w — THREE.Quaternion order. Used where free unconstrained 3D rotation with no
 * gimbal lock is needed (e.g. ReferenceImage), as opposed to a SceneObject's own stored local
 * Euler transform. */
export type Quat = [number, number, number, number];

export type GeometryType =
  | 'box' | 'sphere' | 'cylinder' | 'cone' | 'capsule' | 'plane' | 'torus' | 'imported';

export interface GeometryDefinition {
  type: GeometryType;
  params: Record<string, number>; // {} for 'imported'
  /** Required iff type === 'imported'. References an AssetRecord holding the real BufferGeometry. */
  assetId?: string;
}

export type SceneObjectType = 'group' | 'mesh';

export interface SceneObjectMetadata {
  role?: string;
  symmetryGroup?: string;
  mirrorOf?: string;
  mirrorAxis?: 'x' | 'y' | 'z';
  /** Stamped once at creation; drives scene-tree grouping (Build/Import/Reconstruction). */
  origin?: 'build' | 'import' | 'reconstruction';
  /** Set only by JoinCommand — the exact pre-join snapshots, so Separate can reverse losslessly. */
  joinedFrom?: SceneObject[];
  /** Present only when origin === 'reconstruction'. Always an estimate, never a measurement. */
  reconstruction?: {
    estimated: true;
    sourceImageAssetId: string;
    method: string;
    componentDetection: 'single-object';
  };
  [key: string]: unknown;
}

export interface SceneObject {
  id: string;
  name: string;
  type: SceneObjectType;
  geometry?: GeometryDefinition;
  material?: string;
  /** Local transform, relative to parentId (or world if parentId is null). */
  position: Vec3;
  rotation: Vec3; // Euler radians, local
  scale: Vec3;
  parentId: string | null;
  children: string[];
  visible: boolean;
  locked: boolean;
  metadata: SceneObjectMetadata;
}

export type MaterialPreset = 'metal' | 'plastic' | 'glass' | 'fiber' | 'custom';

export interface MaterialDefinition {
  id: string;
  name: string;
  preset: MaterialPreset;
  color: string; // hex
  metalness: number;
  roughness: number;
  opacity: number;
  transparent: boolean;
  emissive: string; // hex
  emissiveIntensity: number;
}

export type ConnectionType = 'FIXED' | 'HINGE' | 'SLIDER' | 'FREE';

export interface Connection {
  id: string;
  parentObjectId: string;
  childObjectId: string;
  connectionPointA: Vec3;
  connectionPointB: Vec3;
  /** Real, stored data — no solver runs on it yet (see SimulationEngine). */
  type: ConnectionType;
  createdAt: string;
}

/** Binary-ish payload for anything a SceneObject can't represent as primitive params:
 * imported/reconstructed geometry, and reference/source images. Never shared mutably
 * across projects — each insertion (import, library, duplicate) clones a fresh record. */
export type AssetKind = 'geometry' | 'sourceFile' | 'sourceImage';

export interface AssetRecord {
  id: string;
  kind: AssetKind;
  mimeType: string;
  name: string;
  /** UTF-8 JSON text for kind==='geometry' (BufferGeometry.toJSON()); base64 for sourceFile/sourceImage.
   * One JSON-safe string field so this flows through Dexie / ProjectVersion.snapshot / .stark export
   * identically to every other record in this app — no binary special-casing anywhere else. */
  data: string;
  createdAt: string;
}

/** A non-geometry visual reference placed in the viewport for manual "Image -> Build" tracing.
 * Deliberately NOT a SceneObject: never touched by Join/Separate/Mirror/AnalysisEngine. */
export interface ReferenceImage {
  id: string;
  assetId: string; // AssetRecord of kind 'sourceImage'
  name: string;
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
  opacity: number;
  visible: boolean;
  locked: boolean;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  snapshot: {
    components: SceneObject[];
    materials: MaterialDefinition[];
    assemblies: Connection[];
    assets: AssetRecord[];
    referenceImages: ReferenceImage[];
  };
}

export interface HistoryLogEntry {
  id: string;
  projectId: string;
  timestamp: string;
  description: string;
}

export interface ProjectSettings {
  gridVisible: boolean;
  snapEnabled: boolean;
  snapStep: number;
}

export interface ProjectMeta {
  id: string;
  name: string;
  description: string;
  template: string;
  createdAt: string;
  updatedAt: string;
  settings: ProjectSettings;
}

/** A saved library entry — a complete project ('model') or a single reusable subtree ('part').
 * Same shape either way; `kind` only affects which Library tab lists it. */
export interface SavedModel {
  id: string;
  kind: 'model' | 'part';
  name: string;
  category?: string; // parts only, e.g. "Mechanical"
  thumbnail?: string; // data URL, optional
  createdAt: string;
  updatedAt: string;
  version: number;
  snapshot: {
    components: SceneObject[];
    materials: MaterialDefinition[];
    assemblies: Connection[];
    assets: AssetRecord[];
  };
}
