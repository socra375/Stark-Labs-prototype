import { signal } from '../ui/reactive/Store';
import type { ProjectMeta } from './types';

export type AppTool = 'select' | 'move' | 'rotate' | 'scale' | 'mirror' | 'connect' | 'group' | 'ungroup';
export type AppScreen = 'landing' | 'editor';

export class AppState {
  readonly screen = signal<AppScreen>('landing');
  readonly activeTool = signal<AppTool>('select');
  readonly selection = signal<string[]>([]);
  readonly currentProject = signal<ProjectMeta | null>(null);
  readonly dirty = signal<boolean>(false);
  readonly transformSpace = signal<'local' | 'world'>('local');
}
