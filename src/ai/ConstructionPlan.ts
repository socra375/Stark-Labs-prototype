import type { ObjectManager } from '../core/ObjectManager';
import type { AssemblyManager } from '../editor/AssemblyManager';

export interface ConstructionPlanStep {
  order: number;
  objectId: string;
  objectName: string;
  action: 'PLACE' | 'CONNECT';
  detail: string;
}

/** A real, computed build order — a topological pass over the actual parent/child hierarchy
 * (shallowest objects first) followed by the actual assembly connections in stored order. Never
 * an invented "step 1: attach the wing" narrative; every step traces to a real object or a real
 * Connection record. Physics/kinematics still don't execute — this only orders the pieces. */
export function generateConstructionPlan(objects: ObjectManager, assembly: AssemblyManager): ConstructionPlanStep[] {
  const all = objects.getAll();
  const meshes = all.filter((o) => o.type === 'mesh');

  function depth(o: (typeof all)[number]): number {
    let d = 0;
    let cur = o;
    const seen = new Set<string>([o.id]);
    while (cur.parentId) {
      const parent = objects.get(cur.parentId);
      if (!parent || seen.has(parent.id)) break;
      d++;
      seen.add(parent.id);
      cur = parent;
    }
    return d;
  }

  const ordered = [...meshes].sort((a, b) => depth(a) - depth(b) || a.name.localeCompare(b.name));

  const steps: ConstructionPlanStep[] = [];
  let order = 1;
  for (const o of ordered) {
    steps.push({
      order: order++,
      objectId: o.id,
      objectName: o.name,
      action: 'PLACE',
      detail: o.parentId ? `Place "${o.name}" under its parent group.` : `Place "${o.name}" as a base piece.`,
    });
  }
  for (const c of assembly.getAll()) {
    const parent = objects.get(c.parentObjectId);
    const child = objects.get(c.childObjectId);
    if (!parent || !child) continue;
    steps.push({
      order: order++,
      objectId: c.childObjectId,
      objectName: child.name,
      action: 'CONNECT',
      detail: `Connect "${child.name}" to "${parent.name}" (${c.type}).`,
    });
  }
  return steps;
}
