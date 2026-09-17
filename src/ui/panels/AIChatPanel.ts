import type { App } from '../../core/App';
import { confirmAIProposal } from '../components/ConfirmDialog';

export function createAIChatPanel(app: App): HTMLElement {
  const root = document.createElement('div');
  root.className = 'panel-section';
  const title = document.createElement('div');
  title.className = 'panel-section-title';
  title.textContent = `AI Commands — ${app.ai.active.label}`;

  const log = document.createElement('div');
  log.style.cssText = 'max-height:180px;overflow-y:auto;font-size:11px;margin-bottom:8px;';

  const form = document.createElement('form');
  form.style.cssText = 'display:flex;gap:6px;';
  const input = document.createElement('input');
  input.className = 'text-field mono';
  input.style.marginBottom = '0';
  input.placeholder = 'e.g. scale both arms by 10%';
  const sendBtn = document.createElement('button');
  sendBtn.type = 'submit';
  sendBtn.className = 'btn active';
  sendBtn.textContent = 'Send';
  form.append(input, sendBtn);

  function appendLine(text: string, kind: 'user' | 'ai' | 'error' = 'ai'): void {
    const line = document.createElement('div');
    line.className = 'mono';
    const color = kind === 'user' ? 'var(--accent)' : kind === 'error' ? 'var(--danger)' : 'var(--text-1)';
    line.style.cssText = `color:${color};margin-bottom:4px;white-space:pre-wrap;`;
    line.textContent = kind === 'user' ? `> ${text}` : text;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    appendLine(text, 'user');

    if (!app.state.currentProject.get()) {
      appendLine('No project is open.', 'error');
      return;
    }

    const result = await app.ai.interpret(text);
    if (!result.candidates.length) {
      appendLine(result.message ?? 'No matching command.', 'error');
      return;
    }

    for (const candidate of result.candidates) {
      const prepared = await app.aiExecutor.prepare(candidate);
      if (!prepared.ok) {
        appendLine(`[MOCK] ${prepared.error}`, 'error');
        continue;
      }
      appendLine(`[MOCK] ${prepared.proposal.summary}`);
      const confirmed = await confirmAIProposal(prepared.proposal, prepared.requiresConfirmation);
      if (!confirmed) {
        appendLine('Cancelled.');
        continue;
      }
      app.aiExecutor.apply(prepared);
      appendLine(`Applied: ${prepared.proposal.operation}.`);
    }
  });

  root.append(title, log, form);
  return root;
}
