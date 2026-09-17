import { App } from '../../core/App';
import { createHeader } from '../toolbar/Header';
import { createBottomToolbar } from '../toolbar/BottomToolbar';
import { createInspectorPanel } from '../panels/InspectorPanel';
import { createLeftPanel } from '../panels/LeftPanel';
import { createMaterialsPanel } from '../panels/MaterialsPanel';
import { createAssembliesPanel } from '../panels/AssembliesPanel';
import { createVersionsPanel } from '../panels/VersionsPanel';
import { createActivityLogPanel } from '../panels/ActivityLogPanel';
import { createAIChatPanel } from '../panels/AIChatPanel';
import { createAIAnalysisPanel } from '../panels/AIAnalysisPanel';
import { createSimulationBotsPanel } from '../panels/SimulationBotsPanel';
import { createLandingScreen } from './LandingScreen';

export function mountEditorShell(root: HTMLElement): App {
  root.innerHTML = '';
  const shell = document.createElement('div');
  shell.className = 'app-shell';

  const header = createHeader; // reference kept for clarity of construction order
  const left = document.createElement('div');
  left.className = 'panel-left';
  const center = document.createElement('div');
  center.className = 'panel-center';
  const viewportContainer = document.createElement('div');
  viewportContainer.className = 'viewport-container';
  center.appendChild(viewportContainer);
  const right = document.createElement('div');
  right.className = 'panel-right';

  shell.appendChild(center);
  shell.appendChild(left);
  shell.appendChild(right);
  root.appendChild(shell);

  const app = new App(viewportContainer);

  shell.insertBefore(header(app), shell.firstChild);
  left.appendChild(createLeftPanel(app));
  const aiChat = createAIChatPanel(app);
  left.appendChild(aiChat);
  left.appendChild(createAIAnalysisPanel(app));
  right.appendChild(createInspectorPanel(app.inspector));
  right.appendChild(createMaterialsPanel(app));
  right.appendChild(createAssembliesPanel(app));
  right.appendChild(createVersionsPanel(app));
  right.appendChild(createActivityLogPanel(app));
  right.appendChild(createSimulationBotsPanel(app));
  shell.appendChild(createBottomToolbar(app, [], () => {
    aiChat.scrollIntoView({ behavior: 'smooth', block: 'center' });
    aiChat.querySelector('input')?.focus();
  }));
  shell.appendChild(createLandingScreen(app));

  return app;
}
