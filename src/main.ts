import { mountEditorShell } from './ui/screens/EditorShell';

const appEl = document.getElementById('app')!;
const app = mountEditorShell(appEl);

// Exposed for Playwright-driven verification scripts during development.
(window as unknown as { __app: typeof app }).__app = app;
