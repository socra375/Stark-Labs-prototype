import { EventBus } from './EventBus';
import { ObjectManager } from './ObjectManager';
import { AppState } from './AppState';
import { Viewport } from '../3d/Viewport';
import { MaterialManager } from '../3d/MaterialManager';
import { SceneSync } from '../3d/SceneSync';
import { CoordinateSystem } from '../3d/CoordinateSystem';
import { TransformGizmo } from '../3d/TransformGizmo';
import { PickRaycaster } from '../3d/Raycaster';
import { SelectionManager } from '../editor/SelectionManager';
import { Inspector } from '../editor/Inspector';
import { HistoryManager } from '../editor/HistoryManager';
import { GroupingManager } from '../editor/GroupingManager';
import { GroupTransformPivot } from '../editor/GroupTransformPivot';
import { GroupCommand } from '../editor/commands/GroupCommand';
import { UngroupCommand } from '../editor/commands/UngroupCommand';
import { DeleteObjectCommand } from '../editor/commands/DeleteObjectCommand';
import { DuplicateCommand } from '../editor/commands/DuplicateCommand';
import { TransformCommand, type TransformDelta } from '../editor/commands/TransformCommand';
import type { Vec3 } from './types';

/** Top-level orchestrator wiring core managers, the 3D viewport, and app state together. */
export class App {
  readonly bus = new EventBus();
  readonly state = new AppState();
  readonly objects = new ObjectManager(this.bus);
  readonly materials = new MaterialManager(this.bus);
  readonly viewport: Viewport;
  readonly sceneSync: SceneSync;
  readonly coords: CoordinateSystem;
  readonly gizmo: TransformGizmo;
  readonly raycaster = new PickRaycaster();
  readonly selection: SelectionManager;
  readonly inspector: Inspector;
  readonly history: HistoryManager;
  readonly grouping: GroupingManager;
  private pivot: GroupTransformPivot;
  private dragBefore: Map<string, TransformDelta['before']> = new Map();

  constructor(container: HTMLElement) {
    this.viewport = new Viewport(container);
    this.sceneSync = new SceneSync(this.bus, this.objects, this.materials, this.viewport.sceneManager.objectRoot);
    this.coords = new CoordinateSystem(this.objects);
    this.selection = new SelectionManager(this.bus, this.state, this.objects);
    this.inspector = new Inspector(this.bus, this.state, this.objects);
    this.history = new HistoryManager(this.bus, () => this.state.currentProject.get()?.id ?? 'unsaved');
    this.grouping = new GroupingManager(this.objects, this.coords);
    this.pivot = new GroupTransformPivot(this.objects, this.coords, this.viewport.sceneManager.scene);
    this.gizmo = new TransformGizmo(
      this.viewport.camera.instance,
      this.viewport.renderer.webgl.domElement,
      this.viewport.sceneManager.scene,
      (enabled) => this.viewport.controls.setEnabled(enabled),
    );
    this.wireInteraction();
  }

  // --- Selection-driven actions -------------------------------------------------

  deleteSelection(): void {
    const ids = this.selectableIds(this.state.selection.get());
    if (!ids.length) return;
    // A descendant already covered by an ancestor's cascade delete would double-fire; skip those.
    const roots = ids.filter((id) => !this.objects.getAncestors(id).some((a) => ids.includes(a.id)));
    for (const id of roots) this.history.execute(new DeleteObjectCommand(this.objects, id));
    this.selection.clear();
  }

  duplicateSelection(): void {
    const ids = this.selectableIds(this.state.selection.get());
    const newIds: string[] = [];
    for (const id of ids) {
      const cmd = new DuplicateCommand(this.objects, id);
      this.history.execute(cmd);
      newIds.push(cmd.newRootId);
    }
    if (newIds.length) this.selection.set(newIds);
  }

  groupSelection(): void {
    const ids = this.selectableIds(this.state.selection.get());
    const plan = this.grouping.planGroup(ids);
    if (!plan) return;
    this.history.execute(new GroupCommand(this.objects, plan));
    this.selection.selectOnly(plan.group.id);
  }

  ungroupSelection(): void {
    const ids = this.selectableIds(this.state.selection.get());
    if (ids.length !== 1) return;
    const plan = this.grouping.planUngroup(ids[0]);
    if (!plan) return;
    this.history.execute(new UngroupCommand(this.objects, plan));
    this.selection.set(plan.reparents.map((r) => r.objectId));
  }

  private selectableIds(ids: string[]): string[] {
    return ids.filter((id) => !this.objects.get(id)?.locked);
  }

  // --- Interaction wiring ---------------------------------------------------

  private wireInteraction(): void {
    const dom = this.viewport.renderer.webgl.domElement;

    dom.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0 || this.gizmo.isDragging) return;
      const id = this.raycaster.pick(ev, dom, this.viewport.camera.instance, this.viewport.sceneManager.objectRoot);
      this.selection.handlePointerPick(id, { shift: ev.shiftKey, ctrl: ev.ctrlKey || ev.metaKey });
    });

    window.addEventListener('keydown', (ev) => {
      const target = ev.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z' && !ev.shiftKey) { ev.preventDefault(); this.history.undo(); }
      else if ((ev.ctrlKey || ev.metaKey) && (ev.key.toLowerCase() === 'y' || (ev.key.toLowerCase() === 'z' && ev.shiftKey))) { ev.preventDefault(); this.history.redo(); }
      else if (ev.key === 'Delete' || ev.key === 'Backspace') { this.deleteSelection(); }
    });

    this.state.selection.subscribe((ids) => this.attachGizmoToSelection(this.selectableIds(ids)));
    // Undo/redo (and any other history-driven mutation) can remove or reparent the object the
    // gizmo is currently attached to without changing `selection` itself — re-validate the
    // attachment against live objects every time, or TransformControls errors every frame
    // trying to read a detached object's parent.
    this.bus.on('history:changed', () => this.attachGizmoToSelection(this.selectableIds(this.state.selection.get())));
    this.bus.on('object:removed', ({ objectId }) => {
      const ids = this.state.selection.get();
      if (ids.includes(objectId)) this.selection.set(ids.filter((id) => id !== objectId));
    });

    this.state.activeTool.subscribe((tool) => {
      if (tool === 'move') this.gizmo.setMode('translate');
      else if (tool === 'rotate') this.gizmo.setMode('rotate');
      else if (tool === 'scale') this.gizmo.setMode('scale');
      this.bus.emit('tool:changed', { tool });
    });

    this.gizmo.onDragStart = () => this.captureBefore(this.selectableIds(this.state.selection.get()));
    this.gizmo.onChange = () => this.applyGizmoChange();
    this.gizmo.onDragEnd = () => this.commitDrag();
  }

  private attachGizmoToSelection(ids: string[]): void {
    if (ids.length === 1) {
      const obj3d = this.sceneSync.getObject3D(ids[0]);
      if (obj3d) this.gizmo.attach(obj3d);
      else this.gizmo.detach();
    } else if (ids.length > 1) {
      this.pivot.begin(ids);
      this.gizmo.attach(this.pivot.object3D);
    } else {
      this.gizmo.detach();
    }
  }

  private captureBefore(ids: string[]): void {
    this.dragBefore.clear();
    for (const id of ids) {
      const obj = this.objects.getOrThrow(id);
      this.dragBefore.set(id, { position: [...obj.position] as Vec3, rotation: [...obj.rotation] as Vec3, scale: [...obj.scale] as Vec3 });
    }
    if (ids.length > 1) this.pivot.begin(ids);
  }

  private applyGizmoChange(): void {
    const ids = this.selectableIds(this.state.selection.get());
    if (ids.length === 1) {
      const object3D = this.sceneSync.getObject3D(ids[0]);
      if (!object3D) return;
      this.objects.update(ids[0], {
        position: [object3D.position.x, object3D.position.y, object3D.position.z],
        rotation: [object3D.rotation.x, object3D.rotation.y, object3D.rotation.z],
        scale: [object3D.scale.x, object3D.scale.y, object3D.scale.z],
      });
    } else if (ids.length > 1) {
      this.pivot.applyDelta();
    }
  }

  private commitDrag(): void {
    const deltas: TransformDelta[] = [];
    for (const [id, before] of this.dragBefore) {
      const obj = this.objects.get(id);
      if (!obj) continue;
      const after = { position: [...obj.position] as Vec3, rotation: [...obj.rotation] as Vec3, scale: [...obj.scale] as Vec3 };
      if (JSON.stringify(before) !== JSON.stringify(after)) deltas.push({ objectId: id, before, after });
    }
    if (deltas.length) {
      const label = deltas.length === 1 ? `Transformed ${this.objects.get(deltas[0].objectId)?.name}` : `Transformed ${deltas.length} objects`;
      this.history.record(new TransformCommand(this.objects, deltas, label));
    }
    this.dragBefore.clear();
    this.pivot.end();
  }
}
