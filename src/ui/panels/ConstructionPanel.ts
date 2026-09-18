import type { App } from '../../core/App';
import { downloadText } from '../../utils/download';
import { formatConstructionPlanText } from '../../construction/ConstructionExport';

/** MODEL -> COMPONENTS -> VOXELS -> LAYERS -> PLAN. Only PLAN has real logic behind it today
 * (it reuses the already-real AI-layer construction plan); the other four honestly say
 * "Coming Soon" and, when run, report the same real not_implemented message every other stub in
 * this app reports — never a fabricated fabrication step. */
export function createConstructionPanel(app: App): HTMLElement {
  const root = document.createElement('div');
  root.className = 'panel-section';

  const titleRow = document.createElement('div');
  titleRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
  const title = document.createElement('div');
  title.className = 'panel-section-title';
  title.style.marginBottom = '0';
  title.textContent = 'Construction Mode';
  const badge = document.createElement('span');
  badge.className = 'badge-coming-soon';
  badge.textContent = 'Coming Soon';
  titleRow.append(title, badge);

  const stagesLine = document.createElement('div');
  stagesLine.className = 'empty-hint';
  stagesLine.textContent = `Stages: ${app.construction.listStages().join(' → ')}. Only PLAN is real today — it reuses the AI layer's construction-plan computation.`;

  const runBtn = document.createElement('button');
  runBtn.className = 'btn';
  runBtn.style.cssText = 'width:100%;margin:8px 0;';
  runBtn.textContent = 'Run All Stages';

  const output = document.createElement('div');
  output.style.cssText = 'font-size:10px;color:var(--text-2);line-height:1.5;margin-bottom:8px;';

  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn';
  exportBtn.style.cssText = 'width:100%;';
  exportBtn.textContent = 'Download Plan (.txt)';

  runBtn.addEventListener('click', () => {
    const results = app.construction.run();
    output.innerHTML = '';
    for (const r of results) {
      const line = document.createElement('div');
      line.textContent = `${r.stage} [${r.status === 'ok' ? 'REAL' : 'STUB'}]: ${r.message}`;
      output.appendChild(line);
    }
  });

  exportBtn.addEventListener('click', () => {
    const steps = app.construction.getPlanSteps();
    const projectName = app.state.currentProject.get()?.name ?? 'Untitled';
    const text = formatConstructionPlanText(steps, projectName);
    downloadText(`construction-plan-${projectName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt`, text, 'text/plain');
  });

  root.append(titleRow, stagesLine, runBtn, output, exportBtn);
  return root;
}
