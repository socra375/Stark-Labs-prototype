import { describe, it, expect } from 'vitest';
import { EventBus } from '../../src/core/EventBus';
import { ObjectManager } from '../../src/core/ObjectManager';

function makeManager() {
  const bus = new EventBus();
  return { bus, objects: new ObjectManager(bus) };
}

describe('ObjectManager', () => {
  it('create() links a root object and stamps origin:build by default', () => {
    const { objects } = makeManager();
    const box = objects.create({ name: 'Box', type: 'mesh' });
    expect(objects.getRootIds()).toContain(box.id);
    expect(box.metadata.origin).toBe('build');
  });

  it('create() lets a caller-supplied metadata.origin override the default', () => {
    const { objects } = makeManager();
    const box = objects.create({ name: 'Box', type: 'mesh', metadata: { origin: 'import' } });
    expect(box.metadata.origin).toBe('import');
  });

  it('create() with a parentId links the child into the parent.children array', () => {
    const { objects } = makeManager();
    const group = objects.create({ name: 'Group', type: 'group' });
    const child = objects.create({ name: 'Child', type: 'mesh', parentId: group.id });
    expect(objects.get(group.id)!.children).toEqual([child.id]);
    expect(objects.getRootIds()).not.toContain(child.id);
  });

  it('getAncestors() returns the parent chain, nearest first', () => {
    const { objects } = makeManager();
    const grandparent = objects.create({ name: 'GP', type: 'group' });
    const parent = objects.create({ name: 'P', type: 'group', parentId: grandparent.id });
    const child = objects.create({ name: 'C', type: 'mesh', parentId: parent.id });
    expect(objects.getAncestors(child.id).map((o) => o.id)).toEqual([parent.id, grandparent.id]);
  });

  it('getDescendants() returns every nested child regardless of depth', () => {
    const { objects } = makeManager();
    const root = objects.create({ name: 'Root', type: 'group' });
    const mid = objects.create({ name: 'Mid', type: 'group', parentId: root.id });
    const leaf = objects.create({ name: 'Leaf', type: 'mesh', parentId: mid.id });
    const ids = objects.getDescendants(root.id).map((o) => o.id);
    expect(ids).toEqual(expect.arrayContaining([mid.id, leaf.id]));
    expect(ids).toHaveLength(2);
  });

  it('remove() with cascade=true removes children too; cascade=false leaves them orphaned but intact', () => {
    const { objects } = makeManager();
    const parent = objects.create({ name: 'P', type: 'group' });
    const child = objects.create({ name: 'C', type: 'mesh', parentId: parent.id });

    objects.remove(parent.id, false);
    expect(objects.get(parent.id)).toBeUndefined();
    expect(objects.get(child.id)).toBeDefined();

    const parent2 = objects.create({ name: 'P2', type: 'group' });
    const child2 = objects.create({ name: 'C2', type: 'mesh', parentId: parent2.id });
    objects.remove(parent2.id, true);
    expect(objects.get(parent2.id)).toBeUndefined();
    expect(objects.get(child2.id)).toBeUndefined();
  });

  it('reparent() moves an object between parents without touching its stored local transform', () => {
    const { objects } = makeManager();
    const parentA = objects.create({ name: 'A', type: 'group' });
    const parentB = objects.create({ name: 'B', type: 'group' });
    const child = objects.create({ name: 'C', type: 'mesh', parentId: parentA.id, position: [1, 2, 3] });

    objects.reparent(child.id, parentB.id);
    expect(objects.get(parentA.id)!.children).not.toContain(child.id);
    expect(objects.get(parentB.id)!.children).toContain(child.id);
    expect(objects.get(child.id)!.position).toEqual([1, 2, 3]);
  });

  it('insert() re-links a fully-formed object at its stored id without minting a new one (redo-safety)', () => {
    const { objects, bus } = makeManager();
    const events: string[] = [];
    bus.on('project:dirty', () => events.push('dirty'));
    const snapshot = objects.create({ id: 'mesh_fixed', name: 'Fixed', type: 'mesh' });
    objects.remove(snapshot.id, false);
    events.length = 0;

    objects.insert(snapshot);
    expect(objects.get('mesh_fixed')).toBeDefined();
    expect(objects.getRootIds()).toContain('mesh_fixed');
    expect(events).toEqual(['dirty']);
  });
});
