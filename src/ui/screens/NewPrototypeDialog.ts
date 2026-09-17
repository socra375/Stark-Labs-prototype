import type { App } from '../../core/App';
import { TEMPLATES } from '../../templates/TemplateRegistry';

export function openNewPrototypeDialog(app: App, onDone: () => void): void {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const box = document.createElement('div');
  box.className = 'modal-box';

  const title = document.createElement('div');
  title.className = 'modal-title';
  title.textContent = 'NEW PROTOTYPE';

  const nameLabel = document.createElement('label');
  nameLabel.className = 'modal-field-label';
  nameLabel.textContent = 'Name';
  const nameInput = document.createElement('input');
  nameInput.className = 'text-field mono';
  nameInput.value = 'Untitled Prototype';

  const descLabel = document.createElement('label');
  descLabel.className = 'modal-field-label';
  descLabel.textContent = 'Description';
  const descInput = document.createElement('input');
  descInput.className = 'text-field mono';

  const templateLabel = document.createElement('label');
  templateLabel.className = 'modal-field-label';
  templateLabel.textContent = 'Template';

  const grid = document.createElement('div');
  grid.className = 'template-grid';
  let selectedId = TEMPLATES[0].id;
  const optionEls: HTMLElement[] = [];
  for (const t of TEMPLATES) {
    const opt = document.createElement('div');
    opt.className = 'template-option' + (t.id === selectedId ? ' selected' : '');
    const name = document.createElement('div');
    name.className = 't-name';
    name.textContent = t.name;
    const desc = document.createElement('div');
    desc.className = 't-desc';
    desc.textContent = t.description;
    opt.append(name, desc);
    opt.addEventListener('click', () => {
      selectedId = t.id;
      for (const el of optionEls) el.classList.remove('selected');
      opt.classList.add('selected');
    });
    optionEls.push(opt);
    grid.appendChild(opt);
  }

  const buttons = document.createElement('div');
  buttons.className = 'modal-buttons';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => backdrop.remove());
  const createBtn = document.createElement('button');
  createBtn.className = 'btn active';
  createBtn.textContent = 'Create';
  createBtn.addEventListener('click', () => {
    app.newProject(nameInput.value.trim() || 'Untitled Prototype', descInput.value.trim(), selectedId);
    app.state.screen.set('editor');
    backdrop.remove();
    onDone();
  });
  buttons.append(cancelBtn, createBtn);

  box.append(title, nameLabel, nameInput, descLabel, descInput, templateLabel, grid, buttons);
  backdrop.appendChild(box);
  document.body.appendChild(backdrop);
}
