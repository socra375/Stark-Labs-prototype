import type { SceneObject, MaterialDefinition, Connection, AssetRecord, ReferenceImage, ProjectMeta } from '../core/types';
import type { LiveScene } from './ProjectRepository';
import { Serializer } from './Serializer';
import { downloadText, pickFile } from '../utils/download';

export const STARK_FORMAT = 'stark-prototype';
export const STARK_FORMAT_VERSION = '1.0.0';

export interface StarkFile {
  format: typeof STARK_FORMAT;
  version: string;
  exportedAt: string;
  project: Pick<ProjectMeta, 'id' | 'name' | 'description' | 'template' | 'createdAt' | 'updatedAt' | 'settings'>;
  scene: { rootIds: string[] };
  components: SceneObject[];
  materials: MaterialDefinition[];
  assemblies: Connection[];
  assets: AssetRecord[];
  referenceImages: ReferenceImage[];
}

export function exportProject(scene: LiveScene): void {
  const meta = scene.state.currentProject.get();
  if (!meta) return;
  const snapshot = Serializer.capture(scene.objects, scene.materials, scene.assembly, scene.assets);
  const file: StarkFile = {
    format: STARK_FORMAT,
    version: STARK_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    project: meta,
    scene: { rootIds: scene.objects.getRootIds() },
    ...snapshot,
  };
  const safeName = meta.name.replace(/[^a-z0-9_-]+/gi, '_').toLowerCase() || 'prototype';
  downloadText(`${safeName}.stark`, JSON.stringify(file, null, 2));
}

export class StarkFormatError extends Error {}

export function parseStarkFile(text: string): StarkFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new StarkFormatError('File is not valid JSON.');
  }
  if (typeof data !== 'object' || data === null) throw new StarkFormatError('File is not a STARK project.');
  const file = data as Partial<StarkFile>;
  if (file.format !== STARK_FORMAT) throw new StarkFormatError(`Unrecognized format: ${String(file.format)}`);
  if (!Array.isArray(file.components) || !Array.isArray(file.materials) || !Array.isArray(file.assemblies) || !file.project) {
    throw new StarkFormatError('File is missing required project data.');
  }
  // assets/referenceImages didn't exist before 2.0 — default them so a pre-2.0 .stark file still imports cleanly.
  if (!Array.isArray(file.assets)) file.assets = [];
  if (!Array.isArray(file.referenceImages)) file.referenceImages = [];
  return file as StarkFile;
}

/** Opens a file picker, validates the .stark file, and applies it as a new project (new id, so it never collides with an existing one). */
export async function importProjectFromPicker(scene: LiveScene): Promise<ProjectMeta | null> {
  const file = await pickFile('.stark,application/json');
  if (!file) return null;
  const text = await file.text();
  const parsed = parseStarkFile(text);
  const meta: ProjectMeta = {
    ...parsed.project,
    id: `proj_${crypto.randomUUID().slice(0, 8)}`,
    updatedAt: new Date().toISOString(),
  };
  Serializer.apply(scene.objects, scene.materials, scene.assembly, scene.assets, parsed);
  scene.state.currentProject.set(meta);
  scene.state.dirty.set(true);
  return meta;
}
