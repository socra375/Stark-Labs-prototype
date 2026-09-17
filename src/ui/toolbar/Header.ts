import type { AppState } from '../../core/AppState';

export function createHeader(state: AppState): HTMLElement {
  const root = document.createElement('div');
  root.className = 'app-header';

  const brand = document.createElement('div');
  brand.className = 'brand';
  brand.textContent = 'STARK PROTOTYPE LAB';

  const projectName = document.createElement('div');
  projectName.className = 'project-name';
  state.currentProject.subscribe((p) => {
    projectName.textContent = p ? `PROJECT: ${p.name}` : '';
  }, true);

  root.append(brand, projectName);
  return root;
}
