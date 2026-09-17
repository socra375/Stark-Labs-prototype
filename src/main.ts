import { mountEditorShell } from './ui/screens/EditorShell';
import { GEOMETRY_TYPES } from './3d/GeometryFactory';

const appEl = document.getElementById('app')!;
const app = mountEditorShell(appEl);

// M2-M4 debug verification: create one instance of every geometry type with distinct materials.
const metal = app.materials.createPreset('metal');
const plastic = app.materials.createPreset('plastic');
GEOMETRY_TYPES.forEach((type, i) => {
  app.objects.create({
    name: type,
    type: 'mesh',
    geometry: { type, params: {} },
    material: i % 2 === 0 ? metal.id : plastic.id,
    position: [(i - GEOMETRY_TYPES.length / 2) * 1.4, 1, 0],
  });
});
