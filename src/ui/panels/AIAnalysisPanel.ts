import type { App } from '../../core/App';
import type { FindingKind } from '../../ai/AnalysisEngine';

const TAG_CLASS: Record<FindingKind, string> = {
  FACT: 'tag-fact',
  OBSERVATION: 'tag-observation',
  ESTIMATION: 'tag-estimation',
  SUGGESTION: 'tag-suggestion',
  WARNING: 'tag-warning',
};

export function createAIAnalysisPanel(app: App): HTMLElement {
  const root = document.createElement('div');
  root.className = 'panel-section';
  const title = document.createElement('div');
  title.className = 'panel-section-title';
  title.textContent = 'AI Analysis';

  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'btn';
  refreshBtn.style.cssText = 'width:100%;margin-bottom:8px;';
  refreshBtn.textContent = 'Run Analysis';

  const list = document.createElement('div');

  function render(): void {
    list.innerHTML = '';
    const findings = app.analysisEngine.analyze();
    for (const f of findings) {
      const row = document.createElement('div');
      row.style.cssText = 'margin-bottom:8px;';
      const tag = document.createElement('span');
      tag.className = `tag ${TAG_CLASS[f.kind]}`;
      tag.textContent = f.kind;
      const msg = document.createElement('div');
      msg.style.cssText = 'font-size:11px;color:var(--text-1);margin-top:3px;line-height:1.4;';
      msg.textContent = f.message;
      row.append(tag, msg);
      list.appendChild(row);
    }
  }

  refreshBtn.addEventListener('click', render);
  app.bus.on('object:created', render);
  app.bus.on('object:removed', render);
  app.bus.on('scene:loaded', render);
  app.bus.on('assembly:created', render);
  app.bus.on('assembly:removed', render);
  render();

  root.append(title, refreshBtn, list);
  return root;
}
