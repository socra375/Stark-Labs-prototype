import type { App } from '../../core/App';
import { buildTreeRows, type TreeRow } from '../../editor/ObjectTree';

const ORIGIN_LABELS: Record<string, string> = {
  build: 'BUILD',
  import: 'IMPORT',
  reconstruction: 'RECONSTRUCTION (ESTIMATED)',
  joined: 'JOINED',
};
const ORIGIN_ORDER = ['build', 'import', 'reconstruction', 'joined'];

export function createLeftPanel(app: App): HTMLElement {
  const root = document.createElement('div');
  root.className = 'panel-section';
  const title = document.createElement('div');
  title.className = 'panel-section-title';
  title.textContent = 'Components';

  const searchInput = document.createElement('input');
  searchInput.className = 'text-field mono';
  searchInput.style.cssText = 'width:100%;font-size:11px;padding:4px 6px;margin-bottom:6px;';
  searchInput.placeholder = 'Search...';

  const list = document.createElement('div');
  root.append(title, searchInput, list);

  function renderRow(row: TreeRow, selected: Set<string>): HTMLElement {
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
    return el;
  }

  function renderHeader(label: string): HTMLElement {
    const header = document.createElement('div');
    header.style.cssText = 'font-size:10px;color:var(--text-2);text-transform:uppercase;letter-spacing:0.05em;padding:6px 4px 2px;';
    header.textContent = label;
    return header;
  }

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
    const query = searchInput.value.trim().toLowerCase();

    if (query) {
      const matched = rows.filter((r) => r.object.name.toLowerCase().includes(query));
      if (!matched.length) {
        const hint = document.createElement('div');
        hint.className = 'empty-hint';
        hint.textContent = 'No components match your search.';
        list.appendChild(hint);
        return;
      }
      for (const row of matched) list.appendChild(renderRow(row, selected));
      return;
    }

    // Group root-level rows by metadata.origin, keeping each root's own subtree contiguous
    // (buildTreeRows already walks parent-before-children per root, so a depth===0 row starts a
    // new group and every following depth>0 row belongs to it until the next depth===0 row).
    const groups: { origin: string; rows: TreeRow[] }[] = [];
    for (const row of rows) {
      if (row.depth === 0) groups.push({ origin: row.object.metadata.origin ?? 'build', rows: [row] });
      else groups[groups.length - 1].rows.push(row);
    }

    const buckets = new Map<string, TreeRow[]>();
    for (const group of groups) {
      if (!buckets.has(group.origin)) buckets.set(group.origin, []);
      buckets.get(group.origin)!.push(...group.rows);
    }

    const orderedKeys = [...ORIGIN_ORDER, ...[...buckets.keys()].filter((k) => !ORIGIN_ORDER.includes(k))];
    for (const key of orderedKeys) {
      const bucketRows = buckets.get(key);
      if (!bucketRows?.length) continue;
      list.appendChild(renderHeader(ORIGIN_LABELS[key] ?? key.toUpperCase()));
      for (const row of bucketRows) list.appendChild(renderRow(row, selected));
    }
  };

  searchInput.addEventListener('input', render);
  app.bus.on('object:created', render);
  app.bus.on('object:removed', render);
  app.bus.on('object:updated', render);
  app.bus.on('scene:loaded', render);
  app.bus.on('scene:cleared', render);
  app.state.selection.subscribe(render);
  render();

  return root;
}
