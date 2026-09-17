import { App } from '../../core/App';
import { createHeader } from '../toolbar/Header';
import { createBottomToolbar } from '../toolbar/BottomToolbar';
import { createInspectorPanel } from '../panels/InspectorPanel';
import { createLeftPanel } from '../panels/LeftPanel';
import { createMaterialsPanel } from '../panels/MaterialsPanel';
import { createAssembliesPanel } from '../panels/AssembliesPanel';
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

  shell.insertBefore(header(app.state), shell.firstChild);
  left.appendChild(createLeftPanel(app));
  right.appendChild(createInspectorPanel(app.inspector));
  right.appendChild(createMaterialsPanel(app));
  right.appendChild(createAssembliesPanel(app));
  shell.appendChild(createBottomToolbar(app));
  shell.appendChild(createLandingScreen(app));

  return app;
}
