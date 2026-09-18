import type { App } from '../../core/App';
import type { SavedModel } from '../../core/types';

/** Library: MY MODELS is real for M18; MY PARTS/PRINTABLES/THINGIVERSE are real disabled
 * "Coming Soon" tabs (M19/M21) — a future surface, honestly marked, never a fake populated tab. */
export function openLibraryScreen(app: App): void {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const box = document.createElement('div');
  box.className = 'modal-box';
  box.style.width = '620px';
  box.style.maxHeight = '86vh';
  box.style.overflowY = 'auto';

  const title = document.createElement('div');
  title.className = 'modal-title';
  title.textContent = 'LIBRARY';

  const tabsRow = document.createElement('div');
  tabsRow.style.cssText = 'display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;';
  const myModelsTab = document.createElement('button');
  myModelsTab.className = 'btn active';
  myModelsTab.style.cssText = 'padding:4px 10px;font-size:11px;';
  myModelsTab.textContent = 'My Models';
  tabsRow.appendChild(myModelsTab);
  for (const label of ['My Parts', 'Printables', 'Thingiverse']) {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.style.cssText = 'padding:4px 10px;font-size:11px;';
    btn.textContent = `${label} — Coming Soon`;
    btn.disabled = true;
    tabsRow.appendChild(btn);
  }

  const saveRow = document.createElement('div');
  saveRow.style.cssText = 'display:flex;gap:6px;margin-bottom:12px;';
  const nameInput = document.createElement('input');
  nameInput.className = 'text-field mono';
  nameInput.style.cssText = 'flex:1;font-size:11px;padding:4px 6px;';
  nameInput.placeholder = 'Model name';
  nameInput.value = 'Untitled Model';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn active';
  saveBtn.style.cssText = 'padding:4px 10px;font-size:11px;white-space:nowrap;';
  saveBtn.textContent = 'Save Current Scene as Model';
  saveRow.append(nameInput, saveBtn);

  const searchInput = document.createElement('input');
  searchInput.className = 'text-field mono';
  searchInput.style.cssText = 'width:100%;font-size:11px;padding:4px 6px;margin-bottom:12px;';
  searchInput.placeholder = 'Search models...';

  const statusLine = document.createElement('div');
  statusLine.style.cssText = 'font-size:11px;color:var(--text-2);margin-bottom:10px;min-height:14px;';

  const list = document.createElement('div');
  list.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

  const buttons = document.createElement('div');
  buttons.className = 'modal-buttons';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => backdrop.remove());
  buttons.append(closeBtn);

  let allModels: SavedModel[] = [];

  function objectCount(model: SavedModel): number {
    return model.snapshot.components.length;
  }

  function renderList(): void {
    const query = searchInput.value.trim().toLowerCase();
    const filtered = query ? allModels.filter((m) => m.name.toLowerCase().includes(query)) : allModels;
    list.innerHTML = '';
    if (!filtered.length) {
      const hint = document.createElement('div');
      hint.className = 'empty-hint';
      hint.textContent = allModels.length ? 'No models match your search.' : 'No saved models yet.';
      list.appendChild(hint);
      return;
    }
    for (const model of filtered) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px;border:1px solid var(--line);border-radius:var(--radius);';
      const info = document.createElement('div');
      info.style.cssText = 'flex:1;';
      const nameEl = document.createElement('div');
      nameEl.style.cssText = 'font-size:12px;font-weight:600;';
      nameEl.textContent = model.name;
      const metaEl = document.createElement('div');
      metaEl.style.cssText = 'font-size:10px;color:var(--text-2);';
      metaEl.textContent = `${objectCount(model)} object(s) · updated ${new Date(model.updatedAt).toLocaleString()}`;
      info.append(nameEl, metaEl);

      const insertBtn = document.createElement('button');
      insertBtn.className = 'btn';
      insertBtn.style.cssText = 'padding:3px 8px;font-size:10px;';
      insertBtn.textContent = 'Insert';
      insertBtn.addEventListener('click', async () => {
        try {
          await app.insertLibraryItem(model.id);
          statusLine.textContent = `Inserted "${model.name}" into the scene.`;
        } catch (err) {
          statusLine.textContent = err instanceof Error ? err.message : 'Failed to insert model.';
        }
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn danger';
      deleteBtn.style.cssText = 'padding:3px 8px;font-size:10px;';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', async () => {
        if (!window.confirm(`Delete "${model.name}" from the library? This cannot be undone.`)) return;
        await app.deleteLibraryModel(model.id);
        await refresh();
      });

      row.append(info, insertBtn, deleteBtn);
      list.appendChild(row);
    }
  }

  async function refresh(): Promise<void> {
    allModels = await app.listLibraryModels('model');
    renderList();
  }

  searchInput.addEventListener('input', renderList);

  saveBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim() || 'Untitled Model';
    saveBtn.disabled = true;
    try {
      await app.saveCurrentSceneAsModel(name);
      statusLine.textContent = `Saved "${name}" to My Models.`;
      await refresh();
    } catch (err) {
      statusLine.textContent = err instanceof Error ? err.message : 'Failed to save model.';
    } finally {
      saveBtn.disabled = false;
    }
  });

  box.append(title, tabsRow, saveRow, searchInput, statusLine, list, buttons);
  backdrop.appendChild(box);
  document.body.appendChild(backdrop);

  void refresh();
}
