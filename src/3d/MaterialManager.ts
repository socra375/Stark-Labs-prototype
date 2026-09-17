import * as THREE from 'three';
import type { MaterialDefinition, MaterialPreset } from '../core/types';
import { generateId } from '../utils/ids';

export const MATERIAL_PRESETS: Record<Exclude<MaterialPreset, 'custom'>, Omit<MaterialDefinition, 'id' | 'name' | 'preset'>> = {
  metal: { color: '#c9d4e0', metalness: 1, roughness: 0.28, opacity: 1, transparent: false, emissive: '#000000', emissiveIntensity: 0 },
  plastic: { color: '#e0463c', metalness: 0, roughness: 0.55, opacity: 1, transparent: false, emissive: '#000000', emissiveIntensity: 0 },
  glass: { color: '#4fd8ff', metalness: 0, roughness: 0.05, opacity: 0.35, transparent: true, emissive: '#0a3040', emissiveIntensity: 0.15 },
  fiber: { color: '#20242c', metalness: 0.15, roughness: 0.75, opacity: 1, transparent: false, emissive: '#000000', emissiveIntensity: 0 },
};

/** Owns MaterialDefinition records (the data model) and builds/caches the corresponding THREE.MeshStandardMaterial. */
export class MaterialManager {
  private definitions = new Map<string, MaterialDefinition>();
  private cache = new Map<string, THREE.MeshStandardMaterial>();

  createPreset(preset: Exclude<MaterialPreset, 'custom'>, name?: string): MaterialDefinition {
    const base = MATERIAL_PRESETS[preset];
    const def: MaterialDefinition = { id: generateId('mat'), name: name ?? preset, preset, ...base };
    this.definitions.set(def.id, def);
    return def;
  }

  createCustom(partial: Partial<MaterialDefinition> = {}): MaterialDefinition {
    const def: MaterialDefinition = {
      id: generateId('mat'),
      name: partial.name ?? 'Custom Material',
      preset: 'custom',
      color: partial.color ?? '#8899aa',
      metalness: partial.metalness ?? 0.5,
      roughness: partial.roughness ?? 0.5,
      opacity: partial.opacity ?? 1,
      transparent: partial.transparent ?? false,
      emissive: partial.emissive ?? '#000000',
      emissiveIntensity: partial.emissiveIntensity ?? 0,
    };
    this.definitions.set(def.id, def);
    return def;
  }

  insert(def: MaterialDefinition): void {
    this.definitions.set(def.id, def);
  }

  get(id: string): MaterialDefinition | undefined {
    return this.definitions.get(id);
  }

  getAll(): MaterialDefinition[] {
    return [...this.definitions.values()];
  }

  update(id: string, patch: Partial<MaterialDefinition>): void {
    const def = this.definitions.get(id);
    if (!def) return;
    Object.assign(def, patch);
    this.invalidate(id);
  }

  remove(id: string): void {
    this.definitions.delete(id);
    this.disposeCached(id);
  }

  clear(): void {
    for (const id of [...this.cache.keys()]) this.disposeCached(id);
    this.definitions.clear();
  }

  loadAll(defs: MaterialDefinition[]): void {
    this.clear();
    for (const d of defs) this.definitions.set(d.id, { ...d });
  }

  serialize(): MaterialDefinition[] {
    return this.getAll().map((d) => ({ ...d }));
  }

  /** Returns a cached THREE.MeshStandardMaterial for a definition id, building it on first access. */
  getThreeMaterial(id: string): THREE.MeshStandardMaterial {
    const cached = this.cache.get(id);
    if (cached) return cached;
    const def = this.definitions.get(id);
    if (!def) throw new Error(`MaterialDefinition not found: ${id}`);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(def.color),
      metalness: def.metalness,
      roughness: def.roughness,
      opacity: def.opacity,
      transparent: def.transparent || def.opacity < 1,
      emissive: new THREE.Color(def.emissive),
      emissiveIntensity: def.emissiveIntensity,
    });
    this.cache.set(id, mat);
    return mat;
  }

  private invalidate(id: string): void {
    this.disposeCached(id);
  }

  private disposeCached(id: string): void {
    const mat = this.cache.get(id);
    if (mat) {
      mat.dispose();
      this.cache.delete(id);
    }
  }
}
