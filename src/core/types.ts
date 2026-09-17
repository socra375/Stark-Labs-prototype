export type Vec3 = [number, number, number];

export type GeometryType =
  | 'box' | 'sphere' | 'cylinder' | 'cone' | 'capsule' | 'plane' | 'torus';

export interface GeometryDefinition {
  type: GeometryType;
  params: Record<string, number>;
}

export type SceneObjectType = 'group' | 'mesh';

export interface SceneObjectMetadata {
  role?: string;
  symmetryGroup?: string;
  mirrorOf?: string;
  mirrorAxis?: 'x' | 'y' | 'z';
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

export interface Connection {
  id: string;
  parentObjectId: string;
  childObjectId: string;
  connectionPointA: Vec3;
  connectionPointB: Vec3;
  createdAt: string;
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
