import type { App } from '../../core/App';
import type { ProjectVersion } from '../../core/types';
import { Serializer } from '../../storage/Serializer';
import { diffSnapshots } from '../../editor/VersionDiff';

export function createVersionsPanel(app: App): HTMLElement {
  const root = document.createElement('div');
  root.className = 'panel-section';
  const title = document.createElement('div');
  title.className = 'panel-section-title';
  title.textContent = 'Versions';

  const createBtn = document.createElement('button');
  createBtn.className = 'btn';
  createBtn.style.cssText = 'width:100%;margin-bottom:8px;';
  createBtn.textContent = '+ Create Version';
  createBtn.addEventListener('click', async () => {
    const projectId = app.state.currentProject.get()?.id;
    if (!projectId) return;
    const existing = await app.versionRepo.list(projectId);
    const name = window.prompt('Version name', `v${existing.length + 1}`);
    if (name?.trim()) {
      await app.versionRepo.create(app.liveScene(), name.trim());
      render();
    }
  });

  const list = document.createElement('div');
  const diffResult = document.createElement('div');
  diffResult.style.cssText = 'font-size:11px;color:var(--text-1);margin-top:8px;line-height:1.5;';

  root.append(title, createBtn, list, diffResult);

  async function render(): Promise<void> {
    const projectId = app.state.currentProject.get()?.id;
    list.innerHTML = '';
    diffResult.innerHTML = '';
    if (!projectId) return;
    const versions = await app.versionRepo.list(projectId);
    if (!versions.length) {
      const hint = document.createElement('div');
      hint.className = 'empty-hint';
      hint.textContent = 'No versions yet.';
      list.appendChild(hint);
      return;
    }
    for (const v of versions) list.appendChild(renderRow(v));
  }

  function renderRow(version: ProjectVersion): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:11px;';
    const label = document.createElement('span');
    label.style.flex = '1';
    label.textContent = `${version.name} · ${new Date(version.createdAt).toLocaleTimeString()}`;

    const compareBtn = document.createElement('button');
    compareBtn.className = 'btn';
    compareBtn.style.cssText = 'padding:2px 6px;font-size:10px;';
    compareBtn.textContent = 'Compare';
    compareBtn.addEventListener('click', () => showDiff(version));

    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'btn';
    restoreBtn.style.cssText = 'padding:2px 6px;font-size:10px;';
    restoreBtn.textContent = 'Restore';
    restoreBtn.addEventListener('click', async () => {
      if (window.confirm(`Restore "${version.name}"? Unsaved current changes will be replaced.`)) {
        await app.versionRepo.restore(app.liveScene(), version);
        app.history.clear();
        app.selection.clear();
      }
    });

    row.append(label, compareBtn, restoreBtn);
    return row;
  }

  function showDiff(version: ProjectVersion): void {
    const current = Serializer.capture(app.objects, app.materials, app.assembly, app.assets);
    const diff = diffSnapshots(version.snapshot, current);
    diffResult.innerHTML = '';
    const lines = [
      `${version.name} → current`,
      `+${diff.addedComponents.length} added, -${diff.removedComponents.length} removed, ${diff.modifiedComponents.length} modified`,
      `materials: ${diff.materialCountBefore} → ${diff.materialCountAfter}`,
      `assemblies: ${diff.assemblyCountBefore} → ${diff.assemblyCountAfter}`,
    ];
    for (const line of lines) {
      const p = document.createElement('div');
      p.textContent = line;
      diffResult.appendChild(p);
    }
  }

  app.state.currentProject.subscribe(render, true);
  app.bus.on('version:created', render);
  app.bus.on('version:restored', render);

  return root;
}
