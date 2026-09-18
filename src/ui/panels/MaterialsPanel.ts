import type { App } from '../../core/App';
import type { MaterialDefinition, MaterialPreset } from '../../core/types';
import { MaterialChangeCommand } from '../../editor/commands/MaterialChangeCommand';
import { AssignMaterialCommand } from '../../editor/commands/AssignMaterialCommand';

const PRESETS: Exclude<MaterialPreset, 'custom'>[] = ['metal', 'plastic', 'glass', 'fiber', 'titanium', 'carbonFiber', 'rubber', 'gold', 'redMetal', 'blueMetal'];

function presetLabel(preset: string): string {
  return preset.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

export function createMaterialsPanel(app: App): HTMLElement {
  const root = document.createElement('div');
  root.className = 'panel-section';
  const title = document.createElement('div');
  title.className = 'panel-section-title';
  title.textContent = 'Material';
  root.appendChild(title);

  const empty = document.createElement('div');
  empty.className = 'empty-hint';
  empty.textContent = 'Select a mesh to edit its material.';
  root.appendChild(empty);

  const content = document.createElement('div');
  root.appendChild(content);

  const noMaterialHint = document.createElement('div');
  noMaterialHint.className = 'empty-hint';
  noMaterialHint.textContent = 'No material assigned yet — pick a preset below.';
  content.appendChild(noMaterialHint);

  const propertiesWrap = document.createElement('div');
  content.appendChild(propertiesWrap);

  // Assign: existing-material dropdown + "new preset" buttons.
  const assignRow = document.createElement('select');
  assignRow.className = 'text-field mono';
  assignRow.addEventListener('change', () => {
    const objId = currentObjectId();
    if (objId && assignRow.value) app.history.execute(new AssignMaterialCommand(app.objects, objId, assignRow.value));
  });

  const newRow = document.createElement('div');
  newRow.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;';
  for (const preset of PRESETS) {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.style.flex = '1';
    btn.style.fontSize = '11px';
    btn.textContent = presetLabel(preset);
    btn.addEventListener('click', () => {
      const objId = currentObjectId();
      if (!objId) return;
      const def = app.materials.createPreset(preset);
      app.history.execute(new AssignMaterialCommand(app.objects, objId, def.id));
    });
    newRow.appendChild(btn);
  }

  // Property editors.
  const colorField = propertyRow('Color', 'color');
  const emissiveField = propertyRow('Emissive', 'color');
  const metalnessField = propertyRow('Metalness', 'range');
  const roughnessField = propertyRow('Roughness', 'range');
  const opacityField = propertyRow('Opacity', 'range');
  const emissiveIntensityField = propertyRow('Emissive Int.', 'range');

  const transparentRow = document.createElement('label');
  transparentRow.className = 'checkbox-row';
  const transparentCb = document.createElement('input');
  transparentCb.type = 'checkbox';
  transparentRow.append(transparentCb, document.createTextNode('Transparent'));

  propertiesWrap.append(colorField.row, metalnessField.row, roughnessField.row, opacityField.row, emissiveField.row, emissiveIntensityField.row, transparentRow);
  content.append(assignRow, newRow, noMaterialHint, propertiesWrap);

  let editingBefore: Partial<MaterialDefinition> | null = null;

  function currentObjectId(): string | null {
    const ids = app.state.selection.get();
    return ids.length === 1 ? ids[0] : null;
  }

  function currentMaterial(): MaterialDefinition | null {
    const objId = currentObjectId();
    if (!objId) return null;
    const obj = app.objects.get(objId);
    if (!obj?.material) return null;
    return app.materials.get(obj.material) ?? null;
  }

  function refreshDropdown(): void {
    assignRow.innerHTML = '';
    const mat = currentMaterial();
    for (const m of app.materials.getAll()) {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.name} (${m.preset})`;
      if (mat && m.id === mat.id) opt.selected = true;
      assignRow.appendChild(opt);
    }
  }

  function refresh(): void {
    const objId = currentObjectId();
    const mat = currentMaterial();
    empty.style.display = objId ? 'none' : '';
    content.style.display = objId ? '' : 'none';
    noMaterialHint.style.display = mat ? 'none' : '';
    propertiesWrap.style.display = mat ? '' : 'none';
    if (!objId) return;
    refreshDropdown();
    if (!mat) return;
    colorField.input.value = mat.color;
    emissiveField.input.value = mat.emissive;
    metalnessField.input.value = String(mat.metalness);
    roughnessField.input.value = String(mat.roughness);
    opacityField.input.value = String(mat.opacity);
    emissiveIntensityField.input.value = String(mat.emissiveIntensity);
    transparentCb.checked = mat.transparent;
  }

  function wireLive(input: HTMLInputElement, key: keyof MaterialDefinition, parse: (v: string) => string | number): void {
    input.addEventListener('input', () => {
      const mat = currentMaterial();
      if (!mat) return;
      if (!editingBefore) editingBefore = { [key]: mat[key] } as Partial<MaterialDefinition>;
      app.materials.update(mat.id, { [key]: parse(input.value) } as Partial<MaterialDefinition>);
    });
    input.addEventListener('change', () => {
      const mat = currentMaterial();
      if (!mat || !editingBefore) return;
      const after = { [key]: mat[key] } as Partial<MaterialDefinition>;
      app.history.record(new MaterialChangeCommand(app.materials, mat.id, editingBefore, after));
      editingBefore = null;
    });
  }

  wireLive(colorField.input, 'color', (v) => v);
  wireLive(emissiveField.input, 'emissive', (v) => v);
  wireLive(metalnessField.input, 'metalness', parseFloat);
  wireLive(roughnessField.input, 'roughness', parseFloat);
  wireLive(opacityField.input, 'opacity', parseFloat);
  wireLive(emissiveIntensityField.input, 'emissiveIntensity', parseFloat);

  transparentCb.addEventListener('change', () => {
    const mat = currentMaterial();
    if (!mat) return;
    const before = { transparent: mat.transparent };
    const after = { transparent: transparentCb.checked };
    app.materials.update(mat.id, after);
    app.history.record(new MaterialChangeCommand(app.materials, mat.id, before, after));
  });

  app.state.selection.subscribe(refresh, true);
  app.bus.on('object:updated', refresh);
  app.bus.on('material:updated', refresh);

  return root;
}

function propertyRow(label: string, type: 'color' | 'range'): { row: HTMLElement; input: HTMLInputElement } {
  const row = document.createElement('label');
  row.className = 'numeric-field';
  const span = document.createElement('span');
  span.className = 'numeric-field-label';
  span.style.width = '70px';
  span.textContent = label;
  const input = document.createElement('input');
  input.type = type;
  input.className = 'numeric-field-input';
  if (type === 'range') {
    input.min = '0';
    input.max = '1';
    input.step = '0.01';
  }
  row.append(span, input);
  return { row, input };
}
