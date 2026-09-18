import type { App } from '../../core/App';
import type { AppTool } from '../../core/AppState';
import { openSaveAsPartDialog } from '../screens/SaveAsPartDialog';

interface ToolbarButtonSpec {
  tool: AppTool;
  label: string;
}

const CORE_TOOLS: ToolbarButtonSpec[] = [
  { tool: 'select', label: 'Select' },
  { tool: 'move', label: 'Move' },
  { tool: 'rotate', label: 'Rotate' },
  { tool: 'scale', label: 'Scale' },
];

function divider(): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = 'width:1px;align-self:stretch;margin:8px 4px;background:var(--line);';
  return el;
}

export function createBottomToolbar(app: App, extra: HTMLElement[] = [], onAIClick?: () => void): HTMLElement {
  const root = document.createElement('div');
  root.className = 'bottom-toolbar';

  for (const spec of CORE_TOOLS) {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = spec.label;
    btn.addEventListener('click', () => app.state.activeTool.set(spec.tool));
    app.state.activeTool.subscribe((t) => btn.classList.toggle('active', t === spec.tool), true);
    root.appendChild(btn);
  }

  root.appendChild(divider());

  const groupBtn = document.createElement('button');
  groupBtn.className = 'btn';
  groupBtn.textContent = 'Group';
  groupBtn.addEventListener('click', () => app.groupSelection());

  const ungroupBtn = document.createElement('button');
  ungroupBtn.className = 'btn';
  ungroupBtn.textContent = 'Ungroup';
  ungroupBtn.addEventListener('click', () => app.ungroupSelection());

  const duplicateBtn = document.createElement('button');
  duplicateBtn.className = 'btn';
  duplicateBtn.textContent = 'Duplicate';
  duplicateBtn.addEventListener('click', () => app.duplicateSelection());

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn danger';
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', () => app.deleteSelection());

  const savePartBtn = document.createElement('button');
  savePartBtn.className = 'btn';
  savePartBtn.textContent = 'Save as Part';
  savePartBtn.addEventListener('click', () => openSaveAsPartDialog(app));

  const joinBtn = document.createElement('button');
  joinBtn.className = 'btn';
  joinBtn.textContent = 'Join';
  joinBtn.addEventListener('click', () => app.joinSelection());

  const separateBtn = document.createElement('button');
  separateBtn.className = 'btn';
  separateBtn.textContent = 'Separate';
  separateBtn.addEventListener('click', () => app.separateSelection());

  const refreshSelectionButtons = (): void => {
    const ids = app.state.selection.get();
    const n = ids.length;
    groupBtn.disabled = n < 2;
    ungroupBtn.disabled = n !== 1 || app.objects.get(ids[0])?.type !== 'group';
    duplicateBtn.disabled = n < 1;
    deleteBtn.disabled = n < 1;
    savePartBtn.disabled = n < 1;
    joinBtn.disabled = n < 2 || !ids.every((id) => app.objects.get(id)?.type === 'mesh');
    separateBtn.disabled = n !== 1;
  };
  app.state.selection.subscribe(refreshSelectionButtons, true);
  app.bus.on('object:updated', refreshSelectionButtons);

  root.append(groupBtn, ungroupBtn, duplicateBtn, deleteBtn, savePartBtn, joinBtn, separateBtn);
  root.appendChild(divider());

  const mirrorButtons: HTMLButtonElement[] = (['x', 'y', 'z'] as const).map((axis) => {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = `Mirror ${axis.toUpperCase()}`;
    btn.addEventListener('click', () => app.mirrorSelection(axis));
    return btn;
  });

  const connectBtn = document.createElement('button');
  connectBtn.className = 'btn';
  connectBtn.textContent = 'Connect';
  connectBtn.addEventListener('click', () => app.connectSelection());

  const refreshAssemblyButtons = (): void => {
    const n = app.state.selection.get().length;
    for (const btn of mirrorButtons) btn.disabled = n < 1;
    connectBtn.disabled = n !== 2;
  };
  app.state.selection.subscribe(refreshAssemblyButtons, true);

  root.append(...mirrorButtons, connectBtn);
  root.appendChild(divider());

  const undoBtn = document.createElement('button');
  undoBtn.className = 'btn';
  undoBtn.textContent = 'Undo';
  undoBtn.addEventListener('click', () => app.history.undo());

  const redoBtn = document.createElement('button');
  redoBtn.className = 'btn';
  redoBtn.textContent = 'Redo';
  redoBtn.addEventListener('click', () => app.history.redo());

  const refreshHistoryButtons = (): void => {
    undoBtn.disabled = !app.history.canUndo();
    redoBtn.disabled = !app.history.canRedo();
  };
  app.bus.on('history:changed', refreshHistoryButtons);
  refreshHistoryButtons();

  root.append(undoBtn, redoBtn);
  root.appendChild(divider());

  const aiBtn = document.createElement('button');
  aiBtn.className = 'btn';
  aiBtn.textContent = 'AI';
  aiBtn.addEventListener('click', () => onAIClick?.());
  root.appendChild(aiBtn);

  const spacer = document.createElement('div');
  spacer.className = 'spacer';
  root.appendChild(spacer);

  for (const el of extra) root.appendChild(el);

  return root;
}
