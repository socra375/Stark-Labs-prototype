import type { SceneObject, SceneObjectType, GeometryDefinition, Vec3, MaterialDefinition, MaterialPreset } from '../core/types';
import { MATERIAL_PRESETS } from '../3d/MaterialManager';
import { generateId } from '../utils/ids';

export interface TemplateNode {
  name: string;
  geometry?: GeometryDefinition;
  material?: string; // key into the materials map returned alongside the tree
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
  metadata?: Record<string, unknown>;
  children?: TemplateNode[];
}

export interface TemplateResult {
  components: SceneObject[];
  materials: MaterialDefinition[];
}

/** Recursively assigns ids and parent/child links to a TemplateNode tree, resolving `material` keys against `materialsByKey`. */
export function buildTree(nodes: TemplateNode[], materialsByKey: Record<string, MaterialDefinition>, parentId: string | null = null): SceneObject[] {
  const result: SceneObject[] = [];
  for (const node of nodes) {
    const type: SceneObjectType = node.geometry ? 'mesh' : 'group';
    const id = generateId(type === 'group' ? 'grp' : 'mesh');
    const childIds = (node.children ?? []).map(() => '');
    const obj: SceneObject = {
      id,
      name: node.name,
      type,
      geometry: node.geometry,
      material: node.material ? materialsByKey[node.material]?.id : undefined,
      position: node.position ?? [0, 0, 0],
      rotation: node.rotation ?? [0, 0, 0],
      scale: node.scale ?? [1, 1, 1],
      parentId,
      children: childIds,
      visible: true,
      locked: false,
      metadata: { ...(node.metadata ?? {}), origin: 'build' },
    };
    result.push(obj);
    if (node.children?.length) {
      const childObjs = buildTree(node.children, materialsByKey, id);
      obj.children = childObjs.filter((c) => c.parentId === id).map((c) => c.id);
      result.push(...childObjs);
    }
  }
  return result;
}

export function makeMaterial(preset: Exclude<MaterialPreset, 'custom'>, name?: string): MaterialDefinition {
  return { id: generateId('mat'), name: name ?? preset, preset, ...MATERIAL_PRESETS[preset] };
}
