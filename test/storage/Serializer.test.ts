import { describe, it, expect } from 'vitest';
import { EventBus } from '../../src/core/EventBus';
import { ObjectManager } from '../../src/core/ObjectManager';
import { MaterialManager } from '../../src/3d/MaterialManager';
import { AssemblyManager } from '../../src/editor/AssemblyManager';
import { AssetManager } from '../../src/3d/AssetManager';
import { ReferenceImageManager } from '../../src/editor/ReferenceImageManager';
import { Serializer } from '../../src/storage/Serializer';

function makeLiveScene() {
  const bus = new EventBus();
  return {
    bus,
    objects: new ObjectManager(bus),
    materials: new MaterialManager(bus),
    assembly: new AssemblyManager(bus),
    assets: new AssetManager(),
    referenceImages: new ReferenceImageManager(bus),
  };
}

describe('Serializer', () => {
  it('capture() reflects the exact live state of every manager', () => {
    const live = makeLiveScene();
    const mat = live.materials.createPreset('metal', 'Metal');
    const box = live.objects.create({ name: 'Box', type: 'mesh', material: mat.id });
    const box2 = live.objects.create({ name: 'Box2', type: 'mesh' });
    live.assembly.connect(box.id, box2.id, 'HINGE');

    const snapshot = Serializer.capture(live.objects, live.materials, live.assembly, live.assets, live.referenceImages);
    expect(snapshot.components.map((c) => c.id)).toEqual(expect.arrayContaining([box.id, box2.id]));
    expect(snapshot.materials.map((m) => m.id)).toContain(mat.id);
    expect(snapshot.assemblies).toHaveLength(1);
    expect(snapshot.assemblies[0].type).toBe('HINGE');
  });

  it('apply() round-trips a captured snapshot into a fresh set of managers exactly', () => {
    const source = makeLiveScene();
    const mat = source.materials.createPreset('glass', 'Glass');
    const parent = source.objects.create({ name: 'Parent', type: 'group' });
    const child = source.objects.create({ name: 'Child', type: 'mesh', parentId: parent.id, material: mat.id });
    source.assembly.connect(parent.id, child.id, 'SLIDER');
    const snapshot = Serializer.capture(source.objects, source.materials, source.assembly, source.assets, source.referenceImages);

    const target = makeLiveScene();
    Serializer.apply(target.objects, target.materials, target.assembly, target.assets, target.referenceImages, snapshot);

    expect(target.objects.get(child.id)?.name).toBe('Child');
    expect(target.objects.get(child.id)?.parentId).toBe(parent.id);
    expect(target.objects.get(parent.id)?.children).toEqual([child.id]);
    expect(target.materials.get(mat.id)?.preset).toBe('glass');
    expect(target.assembly.getAll()).toHaveLength(1);
    expect(target.assembly.getAll()[0].type).toBe('SLIDER');
  });

  it('apply() fully replaces prior state rather than merging with it', () => {
    const target = makeLiveScene();
    target.objects.create({ name: 'Stale', type: 'mesh' });
    Serializer.apply(target.objects, target.materials, target.assembly, target.assets, target.referenceImages, {
      components: [],
      materials: [],
      assemblies: [],
      assets: [],
      referenceImages: [],
    });
    expect(target.objects.getAll()).toHaveLength(0);
  });
});
