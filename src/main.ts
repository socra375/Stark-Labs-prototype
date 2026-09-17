import { mountEditorShell } from './ui/screens/EditorShell';
import { GEOMETRY_TYPES } from './3d/GeometryFactory';

const appEl = document.getElementById('app')!;
const app = mountEditorShell(appEl);

// Temporary bootstrap until the Landing/New-Prototype screen (M9) replaces it: opens a debug
// project so storage/autosave has something to persist, then seeds one of every geometry type.
app.newProject('Debug Project', '', 'blank');
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

// Exposed for the Playwright-driven storage verification (M8); removed once the Landing
// screen (M9) gives a real UI for save/open/duplicate/rename/delete.
(window as unknown as { __app: typeof app }).__app = app;
