import type { AIProposal } from '../../ai/types';

/** Renders the real "AI PROPOSAL" card (Target / Operation / Changes / Affected count) and
 * resolves once the user picks Cancel or Apply. Used for every AI action that requires
 * confirmation — the model's output is never applied without this gate. */
export function confirmAIProposal(proposal: AIProposal, requiresConfirmation: boolean): Promise<boolean> {
  if (!requiresConfirmation) return Promise.resolve(true);

  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const box = document.createElement('div');
    box.className = 'modal-box';

    const title = document.createElement('div');
    title.className = 'modal-title';
    title.textContent = 'AI PROPOSAL';

    const opRow = document.createElement('div');
    opRow.className = 'empty-hint';
    opRow.style.cssText = 'color:var(--text-0);margin-bottom:10px;';
    opRow.innerHTML = `<strong>${proposal.operation}</strong> — ${proposal.summary}`;

    const targetsEl = document.createElement('div');
    if (proposal.targets.length) {
      const label = document.createElement('div');
      label.className = 'modal-field-label';
      label.textContent = 'Target';
      const names = document.createElement('div');
      names.className = 'mono';
      names.style.cssText = 'font-size:12px;margin-bottom:12px;';
      names.textContent = proposal.targets.map((t) => t.name).join(', ');
      targetsEl.append(label, names);
    }

    const changesEl = document.createElement('div');
    if (proposal.changes.length) {
      const label = document.createElement('div');
      label.className = 'modal-field-label';
      label.textContent = 'Changes';
      changesEl.appendChild(label);
      for (const c of proposal.changes) {
        const row = document.createElement('div');
        row.className = 'mono';
        row.style.cssText = 'font-size:11px;color:var(--text-1);margin-bottom:3px;';
        row.textContent = c.before ? `${c.field}: ${c.before} → ${c.after}` : `${c.field}: ${c.after}`;
        changesEl.appendChild(row);
      }
    }

    const countEl = document.createElement('div');
    countEl.className = 'empty-hint';
    countEl.style.marginTop = '10px';
    countEl.textContent = `Affected objects: ${proposal.affectedCount}`;

    const buttons = document.createElement('div');
    buttons.className = 'modal-buttons';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => { backdrop.remove(); resolve(false); });
    const applyBtn = document.createElement('button');
    applyBtn.className = 'btn danger';
    applyBtn.textContent = 'Apply';
    applyBtn.addEventListener('click', () => { backdrop.remove(); resolve(true); });
    buttons.append(cancelBtn, applyBtn);

    box.append(title, opRow, targetsEl, changesEl, countEl, buttons);
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
  });
}
