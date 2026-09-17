import type { Inspector } from '../../editor/Inspector';
import { createNumericField } from '../components/NumericField';

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

  content.append(nameSection, transformSection, visSection);

  inspector.fields.id.subscribe((id) => {
    empty.style.display = id ? 'none' : '';
    content.style.display = id ? '' : 'none';
  }, true);

  return root;
}
