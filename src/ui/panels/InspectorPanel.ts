import type { Inspector } from '../../editor/Inspector';
import { createNumericField } from '../components/NumericField';
import { GEOMETRY_EDIT_OPERATIONS } from '../../editor/geometry/GeometryEditOperation';

export function createInspectorPanel(inspector: Inspector): HTMLElement {
  const root = document.createElement('div');

  const empty = document.createElement('div');
  empty.className = 'empty-hint';
  empty.textContent = 'No object selected.';
  root.appendChild(empty);

  const content = document.createElement('div');
  root.appendChild(content);

  const nameSection = document.createElement('div');
  nameSection.className = 'panel-section';
  const nameTitle = document.createElement('div');
  nameTitle.className = 'panel-section-title';
  nameTitle.textContent = 'Name';
  const nameInput = document.createElement('input');
  nameInput.className = 'text-field mono';
  nameInput.addEventListener('change', () => inspector.fields.name.set(nameInput.value));
  inspector.fields.name.subscribe((v) => { if (document.activeElement !== nameInput) nameInput.value = v; }, true);
  const typeLine = document.createElement('div');
  typeLine.className = 'empty-hint';
  inspector.fields.type.subscribe((v) => { typeLine.textContent = `TYPE  ${v}`; }, true);
  nameSection.append(nameTitle, nameInput, typeLine);

  const transformSection = document.createElement('div');
  transformSection.className = 'panel-section';
  const transformTitle = document.createElement('div');
  transformTitle.className = 'panel-section-title';
  transformTitle.textContent = 'Transform';

  const posRow = document.createElement('div');
  posRow.className = 'transform-row';
  posRow.append(
    createNumericField('X', inspector.fields.positionX, 0.1),
    createNumericField('Y', inspector.fields.positionY, 0.1),
    createNumericField('Z', inspector.fields.positionZ, 0.1),
  );
  const rotRow = document.createElement('div');
  rotRow.className = 'transform-row';
  rotRow.append(
    createNumericField('X', inspector.fields.rotationXDeg, 1),
    createNumericField('Y', inspector.fields.rotationYDeg, 1),
    createNumericField('Z', inspector.fields.rotationZDeg, 1),
  );
  const scaleRow = document.createElement('div');
  scaleRow.className = 'transform-row';
  scaleRow.append(
    createNumericField('X', inspector.fields.scaleX, 0.1),
    createNumericField('Y', inspector.fields.scaleY, 0.1),
    createNumericField('Z', inspector.fields.scaleZ, 0.1),
  );

  const posLabel = document.createElement('div');
  posLabel.className = 'panel-section-title';
  posLabel.style.marginTop = '4px';
  posLabel.textContent = 'Position';
  const rotLabel = posLabel.cloneNode() as HTMLElement;
  rotLabel.textContent = 'Rotation (deg)';
  const scaleLabel = posLabel.cloneNode() as HTMLElement;
  scaleLabel.textContent = 'Scale';

  transformSection.append(transformTitle, posLabel, posRow, rotLabel, rotRow, scaleLabel, scaleRow);

  const visSection = document.createElement('div');
  visSection.className = 'panel-section';
  const visRow = document.createElement('label');
  visRow.className = 'checkbox-row';
  const visCb = document.createElement('input');
  visCb.type = 'checkbox';
  visCb.addEventListener('change', () => inspector.fields.visible.set(visCb.checked));
  inspector.fields.visible.subscribe((v) => { visCb.checked = v; }, true);
  visRow.append(visCb, document.createTextNode('Visible'));

  const lockRow = document.createElement('label');
  lockRow.className = 'checkbox-row';
  const lockCb = document.createElement('input');
  lockCb.type = 'checkbox';
  lockCb.addEventListener('change', () => inspector.fields.locked.set(lockCb.checked));
  inspector.fields.locked.subscribe((v) => { lockCb.checked = v; }, true);
  lockRow.append(lockCb, document.createTextNode('Locked'));

  visSection.append(visRow, lockRow);

  // Geometry-editing boundary (M23): a real, honest entry point for imported/reconstruction
  // meshes only — meaningless for a parametric primitive, which has no vertex data to edit yet.
  const geometrySection = document.createElement('div');
  geometrySection.className = 'panel-section';
  geometrySection.style.display = 'none';
  const geometryTitleRow = document.createElement('div');
  geometryTitleRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
  const geometryTitle = document.createElement('div');
  geometryTitle.className = 'panel-section-title';
  geometryTitle.style.marginBottom = '0';
  geometryTitle.textContent = 'Geometry Edit';
  const geometryBadge = document.createElement('span');
  geometryBadge.className = 'badge-coming-soon';
  geometryBadge.textContent = 'Coming Soon';
  geometryTitleRow.append(geometryTitle, geometryBadge);
  const geometryHint = document.createElement('div');
  geometryHint.className = 'empty-hint';
  geometryHint.textContent = 'Vertex/face/edge editing for imported and reconstructed geometry is a future module.';
  const geometryListBtn = document.createElement('button');
  geometryListBtn.className = 'btn';
  geometryListBtn.style.cssText = 'width:100%;margin:8px 0;';
  geometryListBtn.textContent = 'List Planned Operations';
  const geometryOutput = document.createElement('div');
  geometryOutput.style.cssText = 'font-size:10px;color:var(--text-2);line-height:1.5;';
  geometryListBtn.addEventListener('click', () => {
    geometryOutput.innerHTML = '';
    for (const op of GEOMETRY_EDIT_OPERATIONS) {
      const result = op.execute('', { kind: 'vertex', indices: [] });
      const line = document.createElement('div');
      line.textContent = `${result.operation}: ${result.message}`;
      geometryOutput.appendChild(line);
    }
  });
  geometrySection.append(geometryTitleRow, geometryHint, geometryListBtn, geometryOutput);

  content.append(nameSection, transformSection, visSection, geometrySection);

  inspector.fields.id.subscribe((id) => {
    empty.style.display = id ? 'none' : '';
    content.style.display = id ? '' : 'none';
  }, true);
  inspector.fields.origin.subscribe((origin) => {
    geometrySection.style.display = origin === 'import' || origin === 'reconstruction' ? '' : 'none';
  }, true);

  return root;
}
