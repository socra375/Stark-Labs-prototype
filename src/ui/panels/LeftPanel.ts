import type { App } from '../../core/App';
import { buildTreeRows } from '../../editor/ObjectTree';

export function createLeftPanel(app: App): HTMLElement {
  const root = document.createElement('div');
  root.className = 'panel-section';
  const title = document.createElement('div');
  title.className = 'panel-section-title';
  title.textContent = 'Components';
  const list = document.createElement('div');
  root.append(title, list);

  const render = (): void => {
    list.innerHTML = '';
    const rows = buildTreeRows(app.objects);
    if (!rows.length) {
      const hint = document.createElement('div');
      hint.className = 'empty-hint';
      hint.textContent = 'No components yet.';
      list.appendChild(hint);
      return;
    }
    const selected = new Set(app.state.selection.get());
    for (const row of rows) {
      const el = document.createElement('div');
      el.className = 'tree-item' + (selected.has(row.object.id) ? ' selected' : '');
      el.style.paddingLeft = `${6 + row.depth * 14}px`;

      const icon = document.createElement('span');
      icon.className = 'icon';
      icon.textContent = row.object.type === 'group' ? '▸' : '■';

      const name = document.createElement('span');
      name.textContent = row.object.name;
      name.style.flex = '1';
      name.style.overflow = 'hidden';
      name.style.textOverflow = 'ellipsis';

      el.append(icon, name);
      if (row.object.locked) {
        const lock = document.createElement('span');
        lock.className = 'lock-icon mono';
        lock.textContent = '🔒';
        el.appendChild(lock);
      }

      el.addEventListener('click', (ev) => {
        app.selection.handlePointerPick(row.object.id, { shift: ev.shiftKey, ctrl: ev.ctrlKey || ev.metaKey });
      });
      list.appendChild(el);
    }
  };

  app.bus.on('object:created', render);
  app.bus.on('object:removed', render);
  app.bus.on('object:updated', render);
  app.bus.on('scene:loaded', render);
  app.bus.on('scene:cleared', render);
  app.state.selection.subscribe(render);
  render();

  return root;
}
