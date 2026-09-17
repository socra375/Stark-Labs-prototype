import type { App } from '../../core/App';

export function createHeader(app: App): HTMLElement {
  const root = document.createElement('div');
  root.className = 'app-header';

  const brand = document.createElement('div');
  brand.className = 'brand';
  brand.textContent = 'STARK PROTOTYPE LAB';

  const right = document.createElement('div');
  right.style.cssText = 'display:flex;align-items:center;gap:12px;';

  const projectName = document.createElement('div');
  projectName.className = 'project-name';
  app.state.currentProject.subscribe((p) => {
    projectName.textContent = p ? `PROJECT: ${p.name}` : '';
  }, true);

  const importModelBtn = document.createElement('button');
  importModelBtn.className = 'btn';
  importModelBtn.style.cssText = 'padding:4px 10px;font-size:11px;';
  importModelBtn.textContent = 'Import Model';
  importModelBtn.addEventListener('click', async () => {
    try {
      await app.importModel();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Import failed.');
    }
  });
  const updateImportBtn = (): void => {
    const importing = app.state.importing.get();
    importModelBtn.disabled = !app.state.currentProject.get() || importing;
    importModelBtn.textContent = importing ? 'Importing…' : 'Import Model';
  };
  app.state.currentProject.subscribe(updateImportBtn, true);
  app.state.importing.subscribe(updateImportBtn, true);

  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn';
  exportBtn.style.cssText = 'padding:4px 10px;font-size:11px;';
  exportBtn.textContent = 'Export .stark';
  exportBtn.addEventListener('click', () => app.exportProject());
  app.state.currentProject.subscribe((p) => { exportBtn.disabled = !p; }, true);

  const projectsBtn = document.createElement('button');
  projectsBtn.className = 'btn';
  projectsBtn.style.cssText = 'padding:4px 10px;font-size:11px;';
  projectsBtn.textContent = 'Projects';
  projectsBtn.addEventListener('click', () => app.state.screen.set('landing'));

  right.append(projectName, importModelBtn, exportBtn, projectsBtn);
  root.append(brand, right);
  return root;
}
