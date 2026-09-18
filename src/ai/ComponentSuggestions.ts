import type { ObjectManager } from '../core/ObjectManager';
import type { AssemblyManager } from '../editor/AssemblyManager';

export interface ComponentSuggestion {
  kind: 'SUGGESTION' | 'WARNING';
  message: string;
  relatedObjectIds: string[];
}

/** Real, deterministic suggestions derived from the live scene graph — never an invented "you
 * should add a bracket here" guess. Every suggestion traces to an objectively-checkable fact: an
 * unpaired _L/_R name, a piece with no parent and no assembly connection, or an empty scene. */
export function suggestComponents(objects: ObjectManager, assembly: AssemblyManager): ComponentSuggestion[] {
  const all = objects.getAll();
  const meshes = all.filter((o) => o.type === 'mesh');

  if (!meshes.length) {
    return [{ kind: 'SUGGESTION', message: 'The scene has no mesh objects yet — add a geometry to begin.', relatedObjectIds: [] }];
  }

  const suggestions: ComponentSuggestion[] = [];

  const byBaseName = new Map<string, { l?: (typeof all)[number]; r?: (typeof all)[number] }>();
  for (const o of all) {
    if (o.name.endsWith('_L')) {
      const base = o.name.slice(0, -2);
      byBaseName.set(base, { ...byBaseName.get(base), l: o });
    } else if (o.name.endsWith('_R')) {
      const base = o.name.slice(0, -2);
      byBaseName.set(base, { ...byBaseName.get(base), r: o });
    }
  }
  for (const [base, pair] of byBaseName) {
    if (pair.l && !pair.r) suggestions.push({ kind: 'SUGGESTION', message: `"${pair.l.name}" has no "${base}_R" counterpart — consider mirroring it across X to add one.`, relatedObjectIds: [pair.l.id] });
    if (pair.r && !pair.l) suggestions.push({ kind: 'SUGGESTION', message: `"${pair.r.name}" has no "${base}_L" counterpart — consider mirroring it across X to add one.`, relatedObjectIds: [pair.r.id] });
  }

  const connectedIds = new Set(assembly.getAll().flatMap((c) => [c.parentObjectId, c.childObjectId]));
  const orphans = meshes.filter((o) => !o.parentId && !connectedIds.has(o.id));
  for (const o of orphans) {
    suggestions.push({ kind: 'WARNING', message: `"${o.name}" is disconnected — it has no parent and no assembly connection to the rest of the model.`, relatedObjectIds: [o.id] });
  }

  if (!suggestions.length) {
    suggestions.push({ kind: 'SUGGESTION', message: 'No structural gaps detected — every piece is grouped, connected, or symmetric.', relatedObjectIds: [] });
  }
  return suggestions;
}
