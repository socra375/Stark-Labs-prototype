import type { SceneSnapshot } from '../storage/Serializer';

export interface VersionDiffResult {
  addedComponents: string[];
  removedComponents: string[];
  modifiedComponents: string[];
  materialCountBefore: number;
  materialCountAfter: number;
  assemblyCountBefore: number;
  assemblyCountAfter: number;
}

/** Structural diff between two scene snapshots (e.g. a saved version vs. the current live scene). */
export function diffSnapshots(before: SceneSnapshot, after: SceneSnapshot): VersionDiffResult {
  const beforeById = new Map(before.components.map((c) => [c.id, c]));
  const afterById = new Map(after.components.map((c) => [c.id, c]));

  const addedComponents: string[] = [];
  const removedComponents: string[] = [];
  const modifiedComponents: string[] = [];

  for (const [id, comp] of afterById) {
    if (!beforeById.has(id)) addedComponents.push(comp.name);
  }
  for (const [id, comp] of beforeById) {
    const match = afterById.get(id);
    if (!match) {
      removedComponents.push(comp.name);
    } else if (
      JSON.stringify(comp.position) !== JSON.stringify(match.position) ||
      JSON.stringify(comp.rotation) !== JSON.stringify(match.rotation) ||
      JSON.stringify(comp.scale) !== JSON.stringify(match.scale) ||
      comp.material !== match.material ||
      comp.name !== match.name
    ) {
      modifiedComponents.push(comp.name);
    }
  }

  return {
    addedComponents,
    removedComponents,
    modifiedComponents,
    materialCountBefore: before.materials.length,
    materialCountAfter: after.materials.length,
    assemblyCountBefore: before.assemblies.length,
    assemblyCountAfter: after.assemblies.length,
  };
}
