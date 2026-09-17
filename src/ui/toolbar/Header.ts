import type { AppState } from '../../core/AppState';

export function createHeader(state: AppState): HTMLElement {
  const root = document.createElement('div');
  root.className = 'app-header';

  const brand = document.createElement('div');
  brand.className = 'brand';
  brand.textContent = 'STARK PROTOTYPE LAB';

  const right = document.createElement('div');
  right.style.cssText = 'display:flex;align-items:center;gap:12px;';

  const projectName = document.createElement('div');
  projectName.className = 'project-name';
  state.currentProject.subscribe((p) => {
    projectName.textContent = p ? `PROJECT: ${p.name}` : '';
  }, true);

  const projectsBtn = document.createElement('button');
  projectsBtn.className = 'btn';
  projectsBtn.style.cssText = 'padding:4px 10px;font-size:11px;';
  projectsBtn.textContent = 'Projects';
  projectsBtn.addEventListener('click', () => state.screen.set('landing'));

  right.append(projectName, projectsBtn);
  root.append(brand, right);
  return root;
}
