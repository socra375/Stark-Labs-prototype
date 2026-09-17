import type { App } from '../../core/App';

/** Non-spatial control surface for reference images (rename/opacity/visible/locked/select/delete) —
 * kept separate from the SceneObject-only Inspector since a ReferenceImage isn't a SceneObject. */
export function createReferenceImagesPanel(app: App): HTMLElement {
  const root = document.createElement('div');
  root.className = 'panel-section';
  const title = document.createElement('div');
  title.className = 'panel-section-title';
  title.textContent = 'Reference Images';
  const list = document.createElement('div');
  root.append(title, list);

  const render = (): void => {
    list.innerHTML = '';
    const images = app.referenceImages.getAll();
    if (!images.length) {
      const hint = document.createElement('div');
      hint.className = 'empty-hint';
      hint.textContent = 'No reference images yet.';
      list.appendChild(hint);
      return;
    }
    const selectedId = app.state.selectedReferenceImageId.get();
    for (const ref of images) {
      const row = document.createElement('div');
      row.style.cssText = `display:flex;flex-direction:column;gap:4px;margin-bottom:8px;padding:6px;border:1px solid ${ref.id === selectedId ? 'var(--accent)' : 'var(--line)'};border-radius:var(--radius);`;

      const nameRow = document.createElement('div');
      nameRow.style.cssText = 'display:flex;align-items:center;gap:6px;';
      const nameInput = document.createElement('input');
      nameInput.className = 'text-field mono';
      nameInput.style.cssText = 'flex:1;font-size:11px;padding:2px 4px;';
      nameInput.value = ref.name;
      nameInput.addEventListener('change', () => app.renameReferenceImage(ref.id, nameInput.value.trim() || ref.name));
      const selectBtn = document.createElement('button');
      selectBtn.className = 'btn';
      selectBtn.style.cssText = 'padding:2px 6px;font-size:10px;';
      selectBtn.textContent = 'Select';
      selectBtn.addEventListener('click', () => app.selectReferenceImage(ref.id));
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn danger';
      deleteBtn.style.cssText = 'padding:2px 6px;font-size:10px;';
      deleteBtn.textContent = '✕';
      deleteBtn.addEventListener('click', () => app.deleteReferenceImage(ref.id));
      nameRow.append(nameInput, selectBtn, deleteBtn);

      const opacityRow = document.createElement('div');
      opacityRow.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:10px;color:var(--text-2);';
      const opacityLabel = document.createElement('span');
      opacityLabel.textContent = 'Opacity';
      const opacityInput = document.createElement('input');
      opacityInput.type = 'range';
      opacityInput.min = '0';
      opacityInput.max = '1';
      opacityInput.step = '0.05';
      opacityInput.value = String(ref.opacity);
      opacityInput.style.flex = '1';
      opacityInput.addEventListener('input', () => app.setReferenceImageOpacity(ref.id, parseFloat(opacityInput.value)));
      opacityRow.append(opacityLabel, opacityInput);

      const flagsRow = document.createElement('div');
      flagsRow.style.cssText = 'display:flex;align-items:center;gap:12px;font-size:10px;color:var(--text-2);';
      const visibleLabel = document.createElement('label');
      visibleLabel.style.cssText = 'display:flex;align-items:center;gap:4px;';
      const visibleInput = document.createElement('input');
      visibleInput.type = 'checkbox';
      visibleInput.checked = ref.visible;
      visibleInput.addEventListener('change', () => app.toggleReferenceImageVisible(ref.id));
      visibleLabel.append(visibleInput, document.createTextNode('Visible'));
      const lockedLabel = document.createElement('label');
      lockedLabel.style.cssText = 'display:flex;align-items:center;gap:4px;';
      const lockedInput = document.createElement('input');
      lockedInput.type = 'checkbox';
      lockedInput.checked = ref.locked;
      lockedInput.addEventListener('change', () => app.toggleReferenceImageLock(ref.id));
      lockedLabel.append(lockedInput, document.createTextNode('Locked'));
      flagsRow.append(visibleLabel, lockedLabel);

      row.append(nameRow, opacityRow, flagsRow);
      list.appendChild(row);
    }
  };

  app.bus.on('referenceImage:created', render);
  app.bus.on('referenceImage:updated', render);
  app.bus.on('referenceImage:removed', render);
  // Serializer.apply()'s bulk referenceImages.loadAll() doesn't fire per-item events — only the
  // shared 'scene:loaded' event (same one SceneSync/ReferenceImageVisualizer rebuild off of).
  app.bus.on('scene:loaded', render);
  app.state.selectedReferenceImageId.subscribe(render);
  render();

  return root;
}
