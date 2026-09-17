import type { ObjectManager } from '../../core/ObjectManager';
import type { SceneObject } from '../../core/types';
import type { Command } from './Command';
import { generateId } from '../../utils/ids';

/** Deep-copies a subtree (new ids throughout, same relative structure) offset slightly on X. */
export class DuplicateCommand implements Command {
  private snapshots: SceneObject[] = [];
  readonly newRootId: string;

  constructor(private objects: ObjectManager, sourceId: string, offset: [number, number, number] = [0.4, 0, 0]) {
    const idMap = new Map<string, string>();
    const source = objects.getOrThrow(sourceId);
    const subtree = [source, ...objects.getDescendants(sourceId)];
    for (const obj of subtree) idMap.set(obj.id, generateId(obj.type === 'group' ? 'grp' : 'mesh'));

    this.snapshots = subtree.map((obj) => ({
      ...structuredClone(obj),
      id: idMap.get(obj.id)!,
      name: obj.id === sourceId ? `${obj.name} copy` : obj.name,
      parentId: obj.id === sourceId ? obj.parentId : (idMap.get(obj.parentId!) ?? obj.parentId),
      children: obj.children.map((c) => idMap.get(c)!),
      position: obj.id === sourceId ? [obj.position[0] + offset[0], obj.position[1] + offset[1], obj.position[2] + offset[2]] : [...obj.position],
    }));
    this.newRootId = idMap.get(sourceId)!;
  }

  execute(): void {
    for (const snap of this.snapshots) this.objects.insert(structuredClone(snap));
  }

  undo(): void {
    for (const snap of [...this.snapshots].reverse()) this.objects.remove(snap.id, false);
  }

  describe(): string {
    return `Duplicated ${this.snapshots[0]?.name ?? this.newRootId}`;
  }
}
