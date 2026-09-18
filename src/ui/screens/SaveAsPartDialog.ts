import type { App } from '../../core/App';

/** Small modal for naming + categorizing a selection before saving it as a reusable Part. */
export function openSaveAsPartDialog(app: App): void {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const box = document.createElement('div');
  box.className = 'modal-box';

  const title = document.createElement('div');
  title.className = 'modal-title';
  title.textContent = 'SAVE AS PART';

  const nameLabel = document.createElement('label');
  nameLabel.className = 'modal-field-label';
  nameLabel.textContent = 'Name';
  const nameInput = document.createElement('input');
  nameInput.className = 'text-field mono';
  nameInput.value = 'Untitled Part';

  const categoryLabel = document.createElement('label');
  categoryLabel.className = 'modal-field-label';
  categoryLabel.textContent = 'Category';
  const categoryInput = document.createElement('input');
  categoryInput.className = 'text-field mono';
  categoryInput.placeholder = 'e.g. Mechanical';

  const statusLine = document.createElement('div');
  statusLine.style.cssText = 'font-size:11px;color:var(--text-2);margin-top:8px;min-height:14px;';

  const buttons = document.createElement('div');
  buttons.className = 'modal-buttons';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => backdrop.remove());
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn active';
  saveBtn.textContent = 'Save Part';
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    try {
      await app.saveSelectionAsPart(nameInput.value.trim() || 'Untitled Part', categoryInput.value.trim());
      backdrop.remove();
    } catch (err) {
      statusLine.textContent = err instanceof Error ? err.message : 'Failed to save part.';
      saveBtn.disabled = false;
    }
  });
  buttons.append(cancelBtn, saveBtn);

  box.append(title, nameLabel, nameInput, categoryLabel, categoryInput, statusLine, buttons);
  backdrop.appendChild(box);
  document.body.appendChild(backdrop);
}
