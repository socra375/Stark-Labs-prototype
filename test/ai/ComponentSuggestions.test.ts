import { describe, it, expect } from 'vitest';
import { EventBus } from '../../src/core/EventBus';
import { ObjectManager } from '../../src/core/ObjectManager';
import { AssemblyManager } from '../../src/editor/AssemblyManager';
import { suggestComponents } from '../../src/ai/ComponentSuggestions';

function makeScene() {
  const bus = new EventBus();
  return { objects: new ObjectManager(bus), assembly: new AssemblyManager(bus) };
}

describe('suggestComponents', () => {
  it('suggests adding a geometry when the scene has no meshes yet', () => {
    const { objects, assembly } = makeScene();
    const suggestions = suggestComponents(objects, assembly);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].kind).toBe('SUGGESTION');
    expect(suggestions[0].message).toMatch(/no mesh objects/i);
  });

  it('flags an unpaired _L object with no matching _R counterpart, referencing its real id', () => {
    const { objects, assembly } = makeScene();
    const armL = objects.create({ name: 'Arm_L', type: 'mesh' });
    const suggestions = suggestComponents(objects, assembly);
    const mirrorSuggestion = suggestions.find((s) => s.message.includes('Arm_R'));
    expect(mirrorSuggestion).toBeDefined();
    expect(mirrorSuggestion!.relatedObjectIds).toEqual([armL.id]);
  });

  it('does not flag a mirror gap when both _L and _R exist', () => {
    const { objects, assembly } = makeScene();
    objects.create({ name: 'Arm_L', type: 'mesh' });
    objects.create({ name: 'Arm_R', type: 'mesh' });
    const suggestions = suggestComponents(objects, assembly);
    expect(suggestions.some((s) => s.message.includes('counterpart'))).toBe(false);
  });

  it('warns about a mesh with no parent and no assembly connection', () => {
    const { objects, assembly } = makeScene();
    const floater = objects.create({ name: 'Floater', type: 'mesh' });
    const suggestions = suggestComponents(objects, assembly);
    const warning = suggestions.find((s) => s.kind === 'WARNING');
    expect(warning).toBeDefined();
    expect(warning!.relatedObjectIds).toEqual([floater.id]);
  });

  it('does not warn about a mesh that has a real assembly connection', () => {
    const { objects, assembly } = makeScene();
    const a = objects.create({ name: 'A', type: 'mesh' });
    const b = objects.create({ name: 'B', type: 'mesh' });
    assembly.connect(a.id, b.id, 'FIXED');
    const suggestions = suggestComponents(objects, assembly);
    expect(suggestions.some((s) => s.kind === 'WARNING')).toBe(false);
  });

  it('reports "no structural gaps" when the scene is fully grouped/connected/symmetric', () => {
    const { objects, assembly } = makeScene();
    const a = objects.create({ name: 'A', type: 'mesh' });
    const b = objects.create({ name: 'B', type: 'mesh' });
    assembly.connect(a.id, b.id, 'FIXED');
    const suggestions = suggestComponents(objects, assembly);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].message).toMatch(/no structural gaps/i);
  });
});
