import { describe, it, expect } from 'vitest';
import { EventBus } from '../../src/core/EventBus';
import { ObjectManager } from '../../src/core/ObjectManager';
import { CoordinateSystem } from '../../src/3d/CoordinateSystem';

function closeTo(a: number, b: number, eps = 1e-5): boolean {
  return Math.abs(a - b) < eps;
}

describe('CoordinateSystem', () => {
  it('getWorldMatrix() composes a chain of local transforms through nested parents', () => {
    const bus = new EventBus();
    const objects = new ObjectManager(bus);
    const coords = new CoordinateSystem(objects);

    const parent = objects.create({ name: 'Parent', type: 'group', position: [10, 0, 0] });
    const child = objects.create({ name: 'Child', type: 'mesh', parentId: parent.id, position: [1, 0, 0] });

    const world = coords.getWorldTransform(child.id);
    expect(closeTo(world.position[0], 11)).toBe(true);
    expect(closeTo(world.position[1], 0)).toBe(true);
    expect(closeTo(world.position[2], 0)).toBe(true);
  });

  it('worldMatrixToLocal() cancels out a non-root parent transform so the result renders at the desired world position', () => {
    const bus = new EventBus();
    const objects = new ObjectManager(bus);
    const coords = new CoordinateSystem(objects);

    const parent = objects.create({ name: 'Parent', type: 'group', position: [5, 5, 5] });
    // Desired world position [8, 5, 5] under a parent sitting at [5, 5, 5] should resolve to a
    // local position of [3, 0, 0].
    const desiredWorldMatrix = coords.getLocalMatrix(objects.create({ name: 'Ref', type: 'mesh', position: [8, 5, 5] }).id);
    const local = coords.worldMatrixToLocal(desiredWorldMatrix, parent.id);
    expect(closeTo(local.position[0], 3)).toBe(true);
    expect(closeTo(local.position[1], 0)).toBe(true);
    expect(closeTo(local.position[2], 0)).toBe(true);
  });

  it('reparentPreservingWorld() keeps an object visually in place across a reparent', () => {
    const bus = new EventBus();
    const objects = new ObjectManager(bus);
    const coords = new CoordinateSystem(objects);

    const parentA = objects.create({ name: 'A', type: 'group', position: [10, 0, 0] });
    const parentB = objects.create({ name: 'B', type: 'group', position: [0, 20, 0] });
    const child = objects.create({ name: 'C', type: 'mesh', parentId: parentA.id, position: [1, 1, 1] });

    const worldBefore = coords.getWorldTransform(child.id);
    const newLocal = coords.reparentPreservingWorld(child.id, parentB.id);
    objects.reparent(child.id, parentB.id);
    objects.update(child.id, { position: newLocal.position, rotation: newLocal.rotation, scale: newLocal.scale });

    const worldAfter = coords.getWorldTransform(child.id);
    for (let i = 0; i < 3; i++) expect(closeTo(worldAfter.position[i], worldBefore.position[i])).toBe(true);
  });
});
