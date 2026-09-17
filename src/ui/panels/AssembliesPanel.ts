import type { App } from '../../core/App';

export function createAssembliesPanel(app: App): HTMLElement {
  const root = document.createElement('div');
  root.className = 'panel-section';
  const title = document.createElement('div');
  title.className = 'panel-section-title';
  title.textContent = 'Assemblies';
  const list = document.createElement('div');
  root.append(title, list);

  const render = (): void => {
    list.innerHTML = '';
    const connections = app.assembly.getAll();
    if (!connections.length) {
      const hint = document.createElement('div');
      hint.className = 'empty-hint';
      hint.textContent = 'No connections yet. Select two objects and click Connect.';
      list.appendChild(hint);
      return;
    }
    for (const c of connections) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:11px;color:var(--text-1);';
      const label = document.createElement('span');
      const a = app.objects.get(c.parentObjectId)?.name ?? c.parentObjectId;
      const b = app.objects.get(c.childObjectId)?.name ?? c.childObjectId;
      label.textContent = `${a} ↔ ${b}`;
      label.style.flex = '1';
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn danger';
      removeBtn.style.cssText = 'padding:2px 6px;font-size:10px;';
      removeBtn.textContent = '✕';
      removeBtn.addEventListener('click', () => app.disconnectConnection(c.id));
      row.append(label, removeBtn);
      list.appendChild(row);
    }
  };

  app.bus.on('assembly:created', render);
  app.bus.on('assembly:removed', render);
  app.bus.on('object:updated', render);
  render();

  return root;
}
