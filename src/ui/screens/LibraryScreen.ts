import type { App } from '../../core/App';
import type { SavedModel } from '../../core/types';
import type { ModelSource } from '../../library/ModelSource';
import { printablesSource } from '../../library/sources/PrintablesSource';
import { thingiverseSource } from '../../library/sources/ThingiverseSource';

type Section = 'model' | 'part' | 'printables' | 'thingiverse';

/** Library: MY MODELS and MY PARTS are real, Dexie-backed collections. PRINTABLES/THINGIVERSE
 * (M21) are real link-out panels backed by ModelSource — never a fake populated search-result
 * list, since neither source's capabilities include search. */
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

  let activeSection: Section = 'model';

  const tabsRow = document.createElement('div');
  tabsRow.style.cssText = 'display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;';
  const myModelsTab = document.createElement('button');
  myModelsTab.className = 'btn active';
  myModelsTab.style.cssText = 'padding:4px 10px;font-size:11px;';
  myModelsTab.textContent = 'My Models';
  const myPartsTab = document.createElement('button');
  myPartsTab.className = 'btn';
  myPartsTab.style.cssText = 'padding:4px 10px;font-size:11px;';
  myPartsTab.textContent = 'My Parts';
  const printablesTab = document.createElement('button');
  printablesTab.className = 'btn';
  printablesTab.style.cssText = 'padding:4px 10px;font-size:11px;';
  printablesTab.textContent = 'Printables';
  const thingiverseTab = document.createElement('button');
  thingiverseTab.className = 'btn';
  thingiverseTab.style.cssText = 'padding:4px 10px;font-size:11px;';
  thingiverseTab.textContent = 'Thingiverse';
  tabsRow.append(myModelsTab, myPartsTab, printablesTab, thingiverseTab);

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

  const partsHint = document.createElement('div');
  partsHint.style.cssText = 'font-size:11px;color:var(--text-2);margin-bottom:12px;display:none;';
  partsHint.textContent = 'Select object(s) in the scene and use "Save as Part" in the bottom toolbar to add one here.';

  const searchInput = document.createElement('input');
  searchInput.className = 'text-field mono';
  searchInput.style.cssText = 'width:100%;font-size:11px;padding:4px 6px;margin-bottom:12px;';
  searchInput.placeholder = 'Search models...';

  const statusLine = document.createElement('div');
  statusLine.style.cssText = 'font-size:11px;color:var(--text-2);margin-bottom:10px;min-height:14px;';

  const list = document.createElement('div');
  list.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

  // External-source (link-out only) panel — built once, contents refreshed per source.
  const externalPanel = document.createElement('div');
  externalPanel.style.cssText = 'display:none;flex-direction:column;gap:10px;';
  const externalBadge = document.createElement('div');
  externalBadge.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:0.04em;color:var(--text-2);';
  const externalNote = document.createElement('div');
  externalNote.style.cssText = 'font-size:11px;color:var(--text-2);';
  externalNote.textContent = 'This app never scrapes or fabricates search results — it only links out to the real site. Type an optional search term, then open the source in a new tab.';
  const externalQueryRow = document.createElement('div');
  externalQueryRow.style.cssText = 'display:flex;gap:6px;';
  const externalQueryInput = document.createElement('input');
  externalQueryInput.className = 'text-field mono';
  externalQueryInput.style.cssText = 'flex:1;font-size:11px;padding:4px 6px;';
  externalQueryInput.placeholder = 'Optional search term...';
  const externalOpenBtn = document.createElement('button');
  externalOpenBtn.className = 'btn active';
  externalOpenBtn.style.cssText = 'padding:4px 10px;font-size:11px;white-space:nowrap;';
  externalOpenBtn.textContent = 'Open Source Page';
  externalQueryRow.append(externalQueryInput, externalOpenBtn);
  externalPanel.append(externalBadge, externalNote, externalQueryRow);

  let activeSource: ModelSource | null = null;
  externalOpenBtn.addEventListener('click', () => {
    if (!activeSource) return;
    const url = activeSource.openSourceUrl(externalQueryInput.value);
    window.open(url, '_blank', 'noopener,noreferrer');
  });

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
      hint.textContent = allModels.length ? 'No models match your search.' : `No saved ${activeSection === 'model' ? 'models' : 'parts'} yet.`;
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
      const categoryPart = model.category ? ` · ${model.category}` : '';
      metaEl.textContent = `${objectCount(model)} object(s)${categoryPart} · updated ${new Date(model.updatedAt).toLocaleString()}`;
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
    if (activeSection !== 'model' && activeSection !== 'part') return;
    allModels = await app.listLibraryModels(activeSection);
    renderList();
  }

  function setActiveTab(section: Section): void {
    activeSection = section;
    myModelsTab.classList.toggle('active', section === 'model');
    myPartsTab.classList.toggle('active', section === 'part');
    printablesTab.classList.toggle('active', section === 'printables');
    thingiverseTab.classList.toggle('active', section === 'thingiverse');
    statusLine.textContent = '';

    const isLocal = section === 'model' || section === 'part';
    saveRow.style.display = section === 'model' ? 'flex' : 'none';
    partsHint.style.display = section === 'part' ? 'block' : 'none';
    searchInput.style.display = isLocal ? '' : 'none';
    list.style.display = isLocal ? 'flex' : 'none';
    externalPanel.style.display = isLocal ? 'none' : 'flex';

    if (isLocal) {
      void refresh();
    } else {
      activeSource = section === 'printables' ? printablesSource : thingiverseSource;
      externalBadge.textContent = `SOURCE: ${activeSource.name.toUpperCase()}`;
      externalQueryInput.value = '';
    }
  }
  myModelsTab.addEventListener('click', () => setActiveTab('model'));
  myPartsTab.addEventListener('click', () => setActiveTab('part'));
  printablesTab.addEventListener('click', () => setActiveTab('printables'));
  thingiverseTab.addEventListener('click', () => setActiveTab('thingiverse'));

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

  box.append(title, tabsRow, saveRow, partsHint, searchInput, statusLine, list, externalPanel, buttons);
  backdrop.appendChild(box);
  document.body.appendChild(backdrop);

  void refresh();
}
