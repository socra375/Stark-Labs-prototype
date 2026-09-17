import type { App } from '../../core/App';
import { openImageTo3DWorkspace } from '../screens/ImageTo3DWorkspace';

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

  const imageTo3DBtn = document.createElement('button');
  imageTo3DBtn.className = 'btn';
  imageTo3DBtn.style.cssText = 'padding:4px 10px;font-size:11px;';
  imageTo3DBtn.textContent = 'Image → 3D';
  imageTo3DBtn.addEventListener('click', () => openImageTo3DWorkspace(app));
  app.state.currentProject.subscribe((p) => { imageTo3DBtn.disabled = !p; }, true);

  const addReferenceBtn = document.createElement('button');
  addReferenceBtn.className = 'btn';
  addReferenceBtn.style.cssText = 'padding:4px 10px;font-size:11px;';
  addReferenceBtn.textContent = 'Add Reference Image';
  addReferenceBtn.addEventListener('click', async () => {
    try {
      await app.addReferenceImage();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to add reference image.');
    }
  });
  app.state.currentProject.subscribe((p) => { addReferenceBtn.disabled = !p; }, true);

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

  right.append(projectName, importModelBtn, imageTo3DBtn, addReferenceBtn, exportBtn, projectsBtn);
  root.append(brand, right);
  return root;
}
