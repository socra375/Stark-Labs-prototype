import { describe, it, expect } from 'vitest';
import { EventBus } from '../../src/core/EventBus';
import { ObjectManager } from '../../src/core/ObjectManager';
import { AssemblyManager } from '../../src/editor/AssemblyManager';
import { generateConstructionPlan } from '../../src/ai/ConstructionPlan';

function makeScene() {
  const bus = new EventBus();
  return { objects: new ObjectManager(bus), assembly: new AssemblyManager(bus) };
}

describe('generateConstructionPlan', () => {
  it('returns no steps for an empty scene', () => {
    const { objects, assembly } = makeScene();
    expect(generateConstructionPlan(objects, assembly)).toEqual([]);
  });

  it('orders PLACE steps by hierarchy depth, shallowest first', () => {
    const { objects, assembly } = makeScene();
    const chassis = objects.create({ name: 'Chassis', type: 'group' });
    const wheel = objects.create({ name: 'Wheel', type: 'mesh', parentId: chassis.id });
    const frame = objects.create({ name: 'Frame', type: 'mesh' }); // root-level, depth 0

    const steps = generateConstructionPlan(objects, assembly);
    const placeSteps = steps.filter((s) => s.action === 'PLACE');
    expect(placeSteps.map((s) => s.objectId)).toEqual([frame.id, wheel.id]);
  });

  it('appends CONNECT steps after every PLACE step, one per real assembly connection', () => {
    const { objects, assembly } = makeScene();
    const frame = objects.create({ name: 'Frame', type: 'mesh' });
    const wheel = objects.create({ name: 'Wheel', type: 'mesh' });
    assembly.connect(frame.id, wheel.id, 'HINGE');

    const steps = generateConstructionPlan(objects, assembly);
    expect(steps.at(-1)!.action).toBe('CONNECT');
    expect(steps.at(-1)!.detail).toContain('HINGE');
    expect(steps.every((s, i) => s.order === i + 1)).toBe(true);
  });

  it('never references a mesh that no longer exists (a dangling connection is silently skipped, not fabricated)', () => {
    const { objects, assembly } = makeScene();
    const frame = objects.create({ name: 'Frame', type: 'mesh' });
    const wheel = objects.create({ name: 'Wheel', type: 'mesh' });
    assembly.connect(frame.id, wheel.id, 'FIXED');
    objects.remove(wheel.id, false);

    const steps = generateConstructionPlan(objects, assembly);
    expect(steps.some((s) => s.action === 'CONNECT')).toBe(false);
  });

  it('excludes group nodes from PLACE steps — only meshes are physical pieces to place', () => {
    const { objects, assembly } = makeScene();
    const group = objects.create({ name: 'Group', type: 'group' });
    const steps = generateConstructionPlan(objects, assembly);
    expect(steps.some((s) => s.objectId === group.id)).toBe(false);
  });
});
