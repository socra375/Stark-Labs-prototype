import type { App } from '../../core/App';

export function createActivityLogPanel(app: App): HTMLElement {
  const root = document.createElement('div');
  root.className = 'panel-section';
  const title = document.createElement('div');
  title.className = 'panel-section-title';
  title.textContent = 'Activity Log';
  const list = document.createElement('div');
  list.style.cssText = 'max-height:160px;overflow-y:auto;';
  root.append(title, list);

  function render(): void {
    const entries = app.history.getLog();
    list.innerHTML = '';
    if (!entries.length) {
      const hint = document.createElement('div');
      hint.className = 'empty-hint';
      hint.textContent = 'No activity yet.';
      list.appendChild(hint);
      return;
    }
    for (const entry of [...entries].reverse().slice(0, 50)) {
      const row = document.createElement('div');
      row.className = 'mono';
      row.style.cssText = 'font-size:10px;color:var(--text-1);margin-bottom:3px;';
      const time = new Date(entry.timestamp).toLocaleTimeString();
      row.textContent = `${time} — ${entry.description}`;
      list.appendChild(row);
    }
  }

  app.bus.on('history:changed', render);
  render();

  return root;
}
