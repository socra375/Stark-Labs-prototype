import type { ObjectManager } from '../core/ObjectManager';
import type { CoordinateSystem } from '../3d/CoordinateSystem';
import type { SceneObject } from '../core/types';
import { reflectMatrixAcrossPlane, decomposeMatrix, invertMatrix, multiplyMatrices } from '../3d/TransformMath';
import { generateId } from '../utils/ids';

function mirroredName(name: string): string {
  if (name.endsWith('_L')) return `${name.slice(0, -2)}_R`;
  if (name.endsWith('_R')) return `${name.slice(0, -2)}_L`;
  return `${name} (mirror)`;
}

/**
 * Mirrors a subtree across the world-origin plane perpendicular to `axis`, using proper
 * Matrix4/Quaternion reflection (TransformMath.reflectMatrixAcrossPlane) on every node's
 * world transform individually — not a single Euler-angle flip on the root — so nested,
 * compound rotations inside the subtree stay geometrically correct.
 */
export class MirrorTool {
  constructor(private objects: ObjectManager, private coords: CoordinateSystem) {}

  planMirror(rootId: string, axis: 'x' | 'y' | 'z'): SceneObject[] {
    const root = this.objects.getOrThrow(rootId);
    const subtree = [root, ...this.objects.getDescendants(rootId)]; // parent-before-child order

    const idMap = new Map<string, string>();
    for (const obj of subtree) idMap.set(obj.id, generateId(obj.type === 'group' ? 'grp' : 'mesh'));

    const originalWorlds = new Map<string, ReturnType<typeof this.coords.getWorldMatrix>>();
    for (const obj of subtree) originalWorlds.set(obj.id, this.coords.getWorldMatrix(obj.id));

    const mirroredWorlds = new Map<string, ReturnType<typeof this.coords.getWorldMatrix>>();
    for (const obj of subtree) mirroredWorlds.set(obj.id, reflectMatrixAcrossPlane(originalWorlds.get(obj.id)!, axis));

    const snapshots: SceneObject[] = subtree.map((obj) => {
      const isRoot = obj.id === rootId;
      const newParentWorld = isRoot
        ? root.parentId
          ? this.coords.getWorldMatrix(root.parentId)
          : null
        : mirroredWorlds.get(obj.parentId!)!;
      const mirroredWorld = mirroredWorlds.get(obj.id)!;
      const local = newParentWorld ? decomposeMatrix(multiplyMatrices(invertMatrix(newParentWorld), mirroredWorld)) : decomposeMatrix(mirroredWorld);

      return {
        ...structuredClone(obj),
        id: idMap.get(obj.id)!,
        name: obj.id === rootId ? mirroredName(obj.name) : obj.name,
        parentId: isRoot ? obj.parentId : idMap.get(obj.parentId!)!,
        children: obj.children.map((c) => idMap.get(c)!),
        position: local.position,
        rotation: local.rotation,
        scale: local.scale,
        metadata: obj.id === rootId ? { ...obj.metadata, mirrorOf: rootId, mirrorAxis: axis } : { ...obj.metadata },
      };
    });

    return snapshots;
  }
}
