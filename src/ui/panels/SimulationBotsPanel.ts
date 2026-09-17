import type { App } from '../../core/App';

export function createSimulationBotsPanel(app: App): HTMLElement {
  const root = document.createElement('div');
  root.className = 'panel-section';

  const simTitleRow = document.createElement('div');
  simTitleRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
  const simTitle = document.createElement('div');
  simTitle.className = 'panel-section-title';
  simTitle.style.marginBottom = '0';
  simTitle.textContent = 'Simulation';
  const simBadge = document.createElement('span');
  simBadge.className = 'badge-coming-soon';
  simBadge.textContent = 'Coming Soon';
  simTitleRow.append(simTitle, simBadge);

  const simList = document.createElement('div');
  simList.className = 'empty-hint';
  simList.textContent = `Modules planned: ${app.simulation.listModules().join(', ')}.`;

  const simRunBtn = document.createElement('button');
  simRunBtn.className = 'btn';
  simRunBtn.style.cssText = 'width:100%;margin:8px 0;';
  simRunBtn.textContent = 'Run Simulation';

  const simOutput = document.createElement('div');
  simOutput.style.cssText = 'font-size:10px;color:var(--text-2);line-height:1.5;margin-bottom:12px;';
  simRunBtn.addEventListener('click', () => {
    const results = app.simulation.run();
    simOutput.innerHTML = '';
    for (const r of results) {
      const line = document.createElement('div');
      line.textContent = `${r.module}: ${r.message}`;
      simOutput.appendChild(line);
    }
  });

  const botsTitleRow = document.createElement('div');
  botsTitleRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
  const botsTitle = document.createElement('div');
  botsTitle.className = 'panel-section-title';
  botsTitle.style.marginBottom = '0';
  botsTitle.textContent = 'Bots';
  const botsBadge = document.createElement('span');
  botsBadge.className = 'badge-coming-soon';
  botsBadge.textContent = 'Coming Soon';
  botsTitleRow.append(botsTitle, botsBadge);

  const botsList = document.createElement('div');
  for (const bot of app.bots.list()) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:6px;';
    const name = document.createElement('span');
    name.style.cssText = 'flex:1;font-size:11px;color:var(--text-1);';
    name.textContent = bot.name;
    const runBtn = document.createElement('button');
    runBtn.className = 'btn';
    runBtn.style.cssText = 'padding:2px 8px;font-size:10px;';
    runBtn.textContent = 'Execute';
    const output = document.createElement('div');
    output.style.cssText = 'font-size:10px;color:var(--text-2);grid-column:1/-1;width:100%;';
    runBtn.addEventListener('click', () => {
      const result = app.bots.execute(bot.id);
      output.textContent = result.message;
    });
    row.append(name, runBtn);
    const wrap = document.createElement('div');
    wrap.style.marginBottom = '4px';
    wrap.append(row, output);
    botsList.appendChild(wrap);
  }

  root.append(simTitleRow, simList, simRunBtn, simOutput, botsTitleRow, botsList);
  return root;
}
