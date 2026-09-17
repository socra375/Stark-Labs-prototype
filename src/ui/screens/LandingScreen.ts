import type { App } from '../../core/App';
import type { ProjectMeta } from '../../core/types';
import { openNewPrototypeDialog } from './NewPrototypeDialog';

export function createLandingScreen(app: App): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'landing-overlay';

  const title = document.createElement('div');
  title.className = 'landing-title';
  title.textContent = 'STARK PROTOTYPE LAB';
  const subtitle = document.createElement('div');
  subtitle.className = 'landing-subtitle';
  subtitle.textContent = '3D PROTOTYPING LABORATORY';

  const actions = document.createElement('div');
  actions.className = 'landing-actions';
  const newBtn = document.createElement('button');
  newBtn.className = 'btn active';
  newBtn.textContent = 'New Prototype';
  newBtn.addEventListener('click', () => openNewPrototypeDialog(app, () => {}));

  const importBtn = document.createElement('button');
  importBtn.className = 'btn';
  importBtn.textContent = 'Import .stark';
  importBtn.addEventListener('click', async () => {
    try {
      const meta = await app.importProject();
      if (meta) {
        app.state.screen.set('editor');
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Import failed.');
    }
  });

  actions.append(newBtn, importBtn);

  const recentSection = document.createElement('div');
  recentSection.className = 'landing-recent';
  const recentTitle = document.createElement('div');
  recentTitle.className = 'landing-recent-title';
  recentTitle.textContent = 'Recent Projects';
  const recentList = document.createElement('div');
  recentSection.append(recentTitle, recentList);

  async function refreshRecent(): Promise<void> {
    const projects = await app.projectRepo.list();
    recentList.innerHTML = '';
    if (!projects.length) {
      const hint = document.createElement('div');
      hint.className = 'empty-hint';
      hint.textContent = 'No saved projects yet.';
      recentList.appendChild(hint);
      return;
    }
    for (const p of projects) recentList.appendChild(renderProjectRow(app, p, refreshRecent));
  }
  refreshRecent();

  app.state.screen.subscribe((screen) => {
    overlay.style.display = screen === 'landing' ? '' : 'none';
    if (screen === 'landing') refreshRecent();
  }, true);

  overlay.append(title, subtitle, actions, recentSection);
  return overlay;
}

function renderProjectRow(app: App, project: ProjectMeta, refresh: () => void): HTMLElement {
  const row = document.createElement('div');
  row.className = 'landing-project-row';

  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = project.name;

  const meta = document.createElement('span');
  meta.className = 'meta';
  meta.textContent = `${project.template} · updated ${new Date(project.updatedAt).toLocaleString()}`;

  const actions = document.createElement('div');
  actions.className = 'actions';

  const openBtn = document.createElement('button');
  openBtn.className = 'btn';
  openBtn.textContent = 'Open';
  openBtn.addEventListener('click', async () => {
    const ok = await app.openProject(project.id);
    if (ok) app.state.screen.set('editor');
  });

  const duplicateBtn = document.createElement('button');
  duplicateBtn.className = 'btn';
  duplicateBtn.textContent = 'Duplicate';
  duplicateBtn.addEventListener('click', async () => {
    await app.projectRepo.duplicate(project.id, `${project.name} copy`);
    refresh();
  });

  const renameBtn = document.createElement('button');
  renameBtn.className = 'btn';
  renameBtn.textContent = 'Rename';
  renameBtn.addEventListener('click', async () => {
    const next = window.prompt('New name', project.name);
    if (next?.trim()) {
      await app.projectRepo.rename(project.id, next.trim());
      refresh();
    }
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn danger';
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', async () => {
    if (window.confirm(`Delete "${project.name}"? This cannot be undone.`)) {
      await app.projectRepo.remove(project.id);
      refresh();
    }
  });

  actions.append(openBtn, duplicateBtn, renameBtn, deleteBtn);
  row.append(name, meta, actions);
  return row;
}
