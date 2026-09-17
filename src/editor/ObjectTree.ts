import type { ObjectManager } from '../core/ObjectManager';
import type { SceneObject } from '../core/types';

export interface TreeRow {
  object: SceneObject;
  depth: number;
}

/** Flattens the SceneObject hierarchy into depth-ordered rows for the left panel tree. */
export function buildTreeRows(objects: ObjectManager): TreeRow[] {
  const rows: TreeRow[] = [];
  const visit = (id: string, depth: number): void => {
    const obj = objects.get(id);
    if (!obj) return;
    rows.push({ object: obj, depth });
    for (const child of obj.children) visit(child, depth + 1);
  };
  for (const rootId of objects.getRootIds()) visit(rootId, 0);
  return rows;
}
