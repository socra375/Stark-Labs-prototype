import { EventBus } from './EventBus';
import { ObjectManager } from './ObjectManager';
import { AppState } from './AppState';
import { Viewport } from '../3d/Viewport';
import { MaterialManager } from '../3d/MaterialManager';
import { AssetManager } from '../3d/AssetManager';
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
import { CreateObjectCommand } from '../editor/commands/CreateObjectCommand';
import { TransformCommand, type TransformDelta } from '../editor/commands/TransformCommand';
import { MirrorTool } from '../editor/MirrorTool';
import { AssemblyManager } from '../editor/AssemblyManager';
import { AssemblyVisualizer } from '../3d/AssemblyVisualizer';
import { ConnectCommand } from '../editor/commands/ConnectCommand';
import { DisconnectCommand } from '../editor/commands/DisconnectCommand';
import { ReferenceImageManager } from '../editor/ReferenceImageManager';
import { ReferenceImageVisualizer } from '../3d/ReferenceImageVisualizer';
import { CreateReferenceImageCommand } from '../editor/commands/CreateReferenceImageCommand';
import { TransformReferenceImageCommand, type ReferenceImageTransform } from '../editor/commands/TransformReferenceImageCommand';
import { DeleteReferenceImageCommand } from '../editor/commands/DeleteReferenceImageCommand';
import { generateId } from '../utils/ids';
import { Database } from '../storage/Database';
import { ProjectRepository, type LiveScene } from '../storage/ProjectRepository';
import { VersionRepository } from '../storage/VersionRepository';
import { HistoryRepository } from '../storage/HistoryRepository';
import { ModelLibraryRepository } from '../storage/ModelLibraryRepository';
import { Serializer } from '../storage/Serializer';
import { remapSavedModelForInsertion } from '../library/LibraryInsertion';
import { capturePartSnapshot } from '../library/PartCapture';
import { InsertLibraryItemCommand } from '../editor/commands/InsertLibraryItemCommand';
import { AutosaveService } from '../storage/AutosaveService';
import { getTemplate } from '../templates/TemplateRegistry';
import { exportProject, importProjectFromPicker } from '../storage/StarkFileFormat';
import { importModelFile } from '../3d/import/ModelImporter';
import { ImportCommand } from '../editor/commands/ImportCommand';
import { toGeometryAssetRecord, defaultCustomMaterial } from '../3d/import/ImportShared';
import { pickFile } from '../utils/download';
import { ReconstructionService } from '../reconstruction/ReconstructionService';
import { toSourceImageAssetRecord } from '../reconstruction/ReconstructionAssets';
import { ReconstructionCommitCommand } from '../editor/commands/ReconstructionCommitCommand';
import type { ReconstructionMode, ReconstructionPreview } from '../reconstruction/types';
import { AIService } from '../ai/AIService';
import { ToolRegistry } from '../ai/ToolRegistry';
import { ToolParser } from '../ai/ToolParser';
import { ToolValidator } from '../ai/ToolValidator';
import { PermissionValidator } from '../ai/PermissionValidator';
import { PreviewGenerator } from '../ai/PreviewGenerator';
import { AICommandExecutor } from '../ai/AICommandExecutor';
import { AnalysisEngine } from '../ai/AnalysisEngine';
import { SimulationEngine } from '../simulation/SimulationEngine';
import { BotManager } from '../bots/BotManager';
import type { Vec3, Connection, ProjectMeta, SceneObject, ReferenceImage, SavedModel } from './types';

/** Top-level orchestrator wiring core managers, the 3D viewport, and app state together. */
export class App {
  readonly bus = new EventBus();
  readonly state = new AppState();
  readonly objects = new ObjectManager(this.bus);
  readonly materials = new MaterialManager(this.bus);
  readonly assets = new AssetManager();
  readonly viewport: Viewport;
  readonly sceneSync: SceneSync;
  readonly coords: CoordinateSystem;
  readonly gizmo: TransformGizmo;
  readonly raycaster = new PickRaycaster();
  readonly selection: SelectionManager;
  readonly inspector: Inspector;
  readonly history: HistoryManager;
  readonly grouping: GroupingManager;
  readonly mirror: MirrorTool;
  readonly assembly: AssemblyManager;
  readonly assemblyVisualizer: AssemblyVisualizer;
  readonly referenceImages: ReferenceImageManager;
  readonly referenceImageVisualizer: ReferenceImageVisualizer;
  readonly db = new Database();
  readonly projectRepo: ProjectRepository;
  readonly versionRepo: VersionRepository;
  readonly historyRepo: HistoryRepository;
  readonly libraryRepo: ModelLibraryRepository;
  readonly autosave: AutosaveService;
  readonly ai = new AIService();
  readonly reconstruction = new ReconstructionService();
  readonly aiTools = new ToolRegistry();
  readonly aiExecutor: AICommandExecutor;
  readonly analysisEngine: AnalysisEngine;
  readonly simulation = new SimulationEngine();
  readonly bots: BotManager;
  private pivot: GroupTransformPivot;
  private dragBefore: Map<string, TransformDelta['before']> = new Map();
  private refDragBefore: ReferenceImageTransform | null = null;

  constructor(container: HTMLElement) {
    this.viewport = new Viewport(container);
    this.sceneSync = new SceneSync(this.bus, this.objects, this.materials, this.viewport.sceneManager.objectRoot, this.assets);
    this.coords = new CoordinateSystem(this.objects);
    this.selection = new SelectionManager(this.bus, this.state, this.objects);
    this.inspector = new Inspector(this.bus, this.state, this.objects);
    this.history = new HistoryManager(this.bus, () => this.state.currentProject.get()?.id ?? 'unsaved');
    this.grouping = new GroupingManager(this.objects, this.coords);
    this.mirror = new MirrorTool(this.objects, this.coords);
    this.assembly = new AssemblyManager(this.bus);
    this.assemblyVisualizer = new AssemblyVisualizer(this.bus, this.assembly, this.coords, this.viewport.sceneManager.scene);
    this.referenceImages = new ReferenceImageManager(this.bus);
    this.referenceImageVisualizer = new ReferenceImageVisualizer(this.bus, this.referenceImages, this.assets, this.viewport.sceneManager.scene);
    this.projectRepo = new ProjectRepository(this.db);
    this.versionRepo = new VersionRepository(this.db, this.bus);
    this.historyRepo = new HistoryRepository(this.db);
    this.libraryRepo = new ModelLibraryRepository(this.db);
    this.autosave = new AutosaveService(this.bus, this.projectRepo, this.liveScene());
    this.analysisEngine = new AnalysisEngine(this.objects, this.assembly, this.coords);
    this.bots = new BotManager(this.objects);
    this.aiExecutor = new AICommandExecutor(
      this.aiTools,
      new ToolParser(this.objects),
      new ToolValidator(this.aiTools),
      new PermissionValidator(this.aiTools),
      new PreviewGenerator(this.aiTools),
      {
        objects: this.objects,
        materials: this.materials,
        assembly: this.assembly,
        coords: this.coords,
        mirror: this.mirror,
        grouping: this.grouping,
        history: this.history,
        versionRepo: this.versionRepo,
        scene: this.liveScene(),
      },
    );
    this.pivot = new GroupTransformPivot(this.objects, this.coords, this.viewport.sceneManager.scene);
    this.gizmo = new TransformGizmo(
      this.viewport.camera.instance,
      this.viewport.renderer.webgl.domElement,
      this.viewport.sceneManager.scene,
      (enabled) => this.viewport.controls.setEnabled(enabled),
    );
    this.wireInteraction();
  }

  // --- Project lifecycle -----------------------------------------------------

  liveScene(): LiveScene {
    return { objects: this.objects, materials: this.materials, assembly: this.assembly, assets: this.assets, referenceImages: this.referenceImages, state: this.state };
  }

  newProject(name: string, description: string, templateId: string): ProjectMeta {
    const meta = this.projectRepo.createMeta(name, description, templateId);
    const { components, materials } = getTemplate(templateId).build();
    this.materials.loadAll(materials);
    this.assets.clear();
    // Must clear before objects.loadAll() fires 'scene:loaded', which triggers
    // ReferenceImageVisualizer.rebuildAll() off whatever referenceImages currently holds.
    this.referenceImages.clear();
    this.objects.loadAll(components);
    this.assembly.clear();
    this.history.clear();
    this.selection.clear();
    this.state.selectedReferenceImageId.set(null);
    this.state.currentProject.set(meta);
    this.state.dirty.set(false);
    // loadAll()-based template seeding never fires 'project:dirty' (it's a bulk load, not an
    // edit), so autosave alone would leave a brand-new project unsaved until the user's first
    // manual change — persist immediately so it shows up in Recent Projects right away.
    void this.saveProject();
    return meta;
  }

  async saveProject(): Promise<void> {
    await this.projectRepo.save(this.liveScene());
  }

  async saveProjectAs(newName: string): Promise<ProjectMeta> {
    return this.projectRepo.saveAs(this.liveScene(), newName);
  }

  async openProject(projectId: string): Promise<boolean> {
    const ok = await this.projectRepo.open(this.liveScene(), projectId);
    if (ok) {
      this.history.clear();
      this.selection.clear();
      this.state.selectedReferenceImageId.set(null);
    }
    return ok;
  }

  exportProject(): void {
    exportProject(this.liveScene());
  }

  async importProject(): Promise<ProjectMeta | null> {
    const meta = await importProjectFromPicker(this.liveScene());
    if (meta) {
      this.history.clear();
      this.selection.clear();
      await this.saveProject();
    }
    return meta;
  }

  /** Imports a .glb/.gltf/.obj/.stl model into the currently open project (not a whole-project
   * import — see importProject() for that). Mirrors importProject()'s shape: no internal
   * try/catch, the UI's click handler surfaces failures via window.alert. */
  async importModel(): Promise<void> {
    const file = await pickFile('.glb,.gltf,.obj,.stl');
    if (!file) return;
    this.state.importing.set(true);
    try {
      const result = await importModelFile(file);
      const cmd = new ImportCommand(this.objects, this.materials, this.assets, { ...result, sourceName: file.name });
      this.history.execute(cmd);
      this.selection.set(result.objects.filter((o) => !o.parentId).map((o) => o.id));
    } finally {
      this.state.importing.set(false);
    }
  }

  /** Runs the active reconstruction engine's non-mutating preview stage (decode/segment/depth/
   * point-cloud) — the live scene is untouched until commitReconstruction() is called separately. */
  async previewReconstruction(file: File, mode: ReconstructionMode = 'ONE_IMAGE'): Promise<ReconstructionPreview> {
    return this.reconstruction.active.preview({ mode, images: [file] });
  }

  /** Commits a reconstruction: re-runs the deterministic pipeline (cheap enough to not bother
   * caching the preview's intermediates) through to a real BufferGeometry, then applies it as one
   * normal, editable SceneObject via ReconstructionCommitCommand — transform/material/undo/save/
   * export/join/separate/mirror all work on it exactly like any other mesh from here on. */
  async commitReconstruction(file: File, mode: ReconstructionMode = 'ONE_IMAGE'): Promise<void> {
    const result = await this.reconstruction.active.generate({ mode, images: [file] });
    const buf = await file.arrayBuffer();
    const sourceImageAsset = toSourceImageAssetRecord(buf, file.type || 'image/png', file.name);
    const geometryAsset = toGeometryAssetRecord(result.geometry, 'Reconstruction Geometry (Estimated)');
    const material = defaultCustomMaterial('Reconstruction Material (Estimated)');
    const object: SceneObject = {
      id: generateId('mesh'),
      name: 'Reconstruction (Estimated)',
      type: 'mesh',
      geometry: { type: 'imported', params: {}, assetId: geometryAsset.id },
      material: material.id,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      parentId: null,
      children: [],
      visible: true,
      locked: false,
      metadata: {
        origin: 'reconstruction',
        reconstruction: {
          estimated: true,
          sourceImageAssetId: sourceImageAsset.id,
          method: result.method,
          componentDetection: result.componentDetection,
        },
      },
    };
    const cmd = new ReconstructionCommitCommand(this.objects, this.materials, this.assets, { sourceImageAsset, geometryAsset, material, object });
    this.history.execute(cmd);
    this.selection.set([object.id]);
  }

  // --- Reference images (Image -> Build) -------------------------------------

  /** Adds a photo as a non-geometry visual reference plane — never a SceneObject, never touched
   * by Join/Separate/Mirror/AnalysisEngine. Default scale matches the image's own aspect ratio
   * so it isn't squished on first placement. */
  async addReferenceImage(): Promise<void> {
    const file = await pickFile('image/*');
    if (!file) return;
    const bitmap = await createImageBitmap(file);
    const aspect = bitmap.height / bitmap.width;
    bitmap.close();
    const buf = await file.arrayBuffer();
    const imageAsset = toSourceImageAssetRecord(buf, file.type || 'image/png', file.name);
    const referenceImage: ReferenceImage = {
      id: generateId('ref'),
      assetId: imageAsset.id,
      name: file.name,
      position: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, aspect, 1],
      opacity: 1,
      visible: true,
      locked: false,
    };
    this.history.execute(new CreateReferenceImageCommand(this.referenceImages, this.assets, imageAsset, referenceImage));
    this.selectReferenceImage(referenceImage.id);
  }

  /** The one mutual-exclusion chokepoint between SceneObject selection and reference-image
   * selection — a ReferenceImage is never a SceneObject, so the two selections can't overlap. */
  selectReferenceImage(id: string | null): void {
    this.state.selectedReferenceImageId.set(id);
  }

  renameReferenceImage(id: string, name: string): void {
    this.referenceImages.update(id, { name });
  }

  setReferenceImageOpacity(id: string, opacity: number): void {
    this.referenceImages.update(id, { opacity });
  }

  toggleReferenceImageVisible(id: string): void {
    const ref = this.referenceImages.get(id);
    if (!ref) return;
    this.referenceImages.update(id, { visible: !ref.visible });
  }

  toggleReferenceImageLock(id: string): void {
    const ref = this.referenceImages.get(id);
    if (!ref) return;
    this.referenceImages.update(id, { locked: !ref.locked });
  }

  deleteReferenceImage(id: string): void {
    this.history.execute(new DeleteReferenceImageCommand(this.referenceImages, this.assets, id));
    if (this.state.selectedReferenceImageId.get() === id) this.state.selectedReferenceImageId.set(null);
  }

  // --- Library (My Models / My Parts) -----------------------------------------

  /** Captures the whole current scene (same snapshot shape every other consumer uses) as a
   * named, independently-stored library entry — not tied to the current project. */
  async saveCurrentSceneAsModel(name: string): Promise<SavedModel> {
    const snapshot = Serializer.capture(this.objects, this.materials, this.assembly, this.assets, this.referenceImages);
    const now = new Date().toISOString();
    const model: SavedModel = {
      id: generateId('model'),
      kind: 'model',
      name,
      createdAt: now,
      updatedAt: now,
      version: 1,
      snapshot: { components: snapshot.components, materials: snapshot.materials, assemblies: snapshot.assemblies, assets: snapshot.assets },
    };
    await this.libraryRepo.save(model);
    return model;
  }

  async listLibraryModels(kind?: 'model' | 'part'): Promise<SavedModel[]> {
    return this.libraryRepo.list(kind);
  }

  async deleteLibraryModel(id: string): Promise<void> {
    await this.libraryRepo.remove(id);
  }

  /** Inserts a real independent copy (fresh ids throughout, deep-cloned data — see
   * remapSavedModelForInsertion) as new root-level object(s) in the current scene. */
  async insertLibraryItem(modelId: string): Promise<void> {
    const model = await this.libraryRepo.get(modelId);
    if (!model) throw new Error('Library model not found.');
    const payload = remapSavedModelForInsertion(model);
    this.history.execute(new InsertLibraryItemCommand(this.objects, this.materials, this.assets, this.assembly, payload));
    this.selection.set(payload.components.filter((c) => !c.parentId).map((c) => c.id));
  }

  /** Saves the current selection (each root plus its descendants) as a reusable Part —
   * self-contained: only the materials/assets/connections that subtree actually uses, never the
   * whole project's asset library. */
  async saveSelectionAsPart(name: string, category: string): Promise<SavedModel> {
    const ids = this.selectableIds(this.state.selection.get());
    if (!ids.length) throw new Error('Select at least one object to save as a part.');
    const snapshot = capturePartSnapshot(this.objects, this.materials, this.assembly, this.assets, ids);
    const now = new Date().toISOString();
    const model: SavedModel = {
      id: generateId('model'),
      kind: 'part',
      name,
      category: category || undefined,
      createdAt: now,
      updatedAt: now,
      version: 1,
      snapshot,
    };
    await this.libraryRepo.save(model);
    return model;
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

  mirrorSelection(axis: 'x' | 'y' | 'z'): void {
    const ids = this.selectableIds(this.state.selection.get());
    const newIds: string[] = [];
    for (const id of ids) {
      const snapshots = this.mirror.planMirror(id, axis);
      const label = `Mirrored ${this.objects.get(id)?.name} across ${axis.toUpperCase()}`;
      this.history.execute(new CreateObjectCommand(this.objects, snapshots, label));
      newIds.push(snapshots[0].id);
    }
    if (newIds.length) this.selection.set(newIds);
  }

  connectSelection(): void {
    const ids = this.selectableIds(this.state.selection.get());
    if (ids.length !== 2) return;
    const [a, b] = ids;
    if (this.assembly.existsBetween(a, b)) return;
    const connection: Connection = {
      id: generateId('conn'),
      parentObjectId: a,
      childObjectId: b,
      connectionPointA: [0, 0, 0],
      connectionPointB: [0, 0, 0],
      type: 'FIXED',
      createdAt: new Date().toISOString(),
    };
    this.history.execute(new ConnectCommand(this.assembly, connection));
  }

  disconnectConnection(connectionId: string): void {
    this.history.execute(new DisconnectCommand(this.assembly, connectionId));
  }

  private selectableIds(ids: string[]): string[] {
    return ids.filter((id) => !this.objects.get(id)?.locked);
  }

  // --- Interaction wiring ---------------------------------------------------

  private wireInteraction(): void {
    const dom = this.viewport.renderer.webgl.domElement;

    dom.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0 || this.gizmo.isDragging) return;
      const objectId = this.raycaster.pick(ev, dom, this.viewport.camera.instance, this.viewport.sceneManager.objectRoot);
      if (objectId) {
        this.selection.handlePointerPick(objectId, { shift: ev.shiftKey, ctrl: ev.ctrlKey || ev.metaKey });
        return;
      }
      const refId = this.raycaster.pick(ev, dom, this.viewport.camera.instance, this.referenceImageVisualizer.getGroup());
      if (refId && !this.referenceImages.get(refId)?.locked) {
        this.selectReferenceImage(refId);
        return;
      }
      this.selection.handlePointerPick(null, { shift: ev.shiftKey, ctrl: ev.ctrlKey || ev.metaKey });
      if (!ev.shiftKey && !ev.ctrlKey && !ev.metaKey) this.state.selectedReferenceImageId.set(null);
    });

    window.addEventListener('keydown', (ev) => {
      const target = ev.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z' && !ev.shiftKey) { ev.preventDefault(); this.history.undo(); }
      else if ((ev.ctrlKey || ev.metaKey) && (ev.key.toLowerCase() === 'y' || (ev.key.toLowerCase() === 'z' && ev.shiftKey))) { ev.preventDefault(); this.history.redo(); }
      else if (ev.key === 'Delete' || ev.key === 'Backspace') { this.deleteSelection(); }
    });

    this.state.selection.subscribe((ids) => this.attachGizmoToSelection(this.selectableIds(ids)));
    // Reference-image selection is mutually exclusive with SceneObject selection (a ReferenceImage
    // is never a SceneObject, so it can't share `state.selection`) — whichever becomes non-empty
    // clears the other, from whatever call site triggered the change.
    this.state.selection.subscribe((ids) => { if (ids.length && this.state.selectedReferenceImageId.get()) this.state.selectedReferenceImageId.set(null); });
    this.state.selectedReferenceImageId.subscribe((id) => {
      if (id) {
        if (this.state.selection.get().length) this.selection.clear();
        const obj3d = this.referenceImageVisualizer.getObject3D(id);
        if (obj3d) this.gizmo.attach(obj3d);
        else this.gizmo.detach();
      } else if (!this.state.selection.get().length) {
        this.gizmo.detach();
      }
    });
    // Undo/redo (and any other history-driven mutation) can remove or reparent the object the
    // gizmo is currently attached to without changing `selection` itself — re-validate the
    // attachment against live objects every time, or TransformControls errors every frame
    // trying to read a detached object's parent.
    this.bus.on('history:changed', () => this.attachGizmoToSelection(this.selectableIds(this.state.selection.get())));
    this.bus.on('object:removed', ({ objectId }) => {
      const ids = this.state.selection.get();
      if (ids.includes(objectId)) this.selection.set(ids.filter((id) => id !== objectId));
      this.assembly.removeAllForObject(objectId);
    });
    this.bus.on('referenceImage:removed', ({ referenceImageId }) => {
      if (this.state.selectedReferenceImageId.get() === referenceImageId) this.state.selectedReferenceImageId.set(null);
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
    const refId = this.state.selectedReferenceImageId.get();
    if (refId) {
      const ref = this.referenceImages.get(refId);
      this.refDragBefore = ref ? { position: [...ref.position], rotation: [...ref.rotation], scale: [...ref.scale] } : null;
      return;
    }
    this.dragBefore.clear();
    for (const id of ids) {
      const obj = this.objects.getOrThrow(id);
      this.dragBefore.set(id, { position: [...obj.position] as Vec3, rotation: [...obj.rotation] as Vec3, scale: [...obj.scale] as Vec3 });
    }
    if (ids.length > 1) this.pivot.begin(ids);
  }

  private applyGizmoChange(): void {
    const refId = this.state.selectedReferenceImageId.get();
    if (refId) {
      const object3D = this.referenceImageVisualizer.getObject3D(refId);
      if (!object3D) return;
      this.referenceImages.update(refId, {
        position: [object3D.position.x, object3D.position.y, object3D.position.z],
        rotation: [object3D.quaternion.x, object3D.quaternion.y, object3D.quaternion.z, object3D.quaternion.w],
        scale: [object3D.scale.x, object3D.scale.y, object3D.scale.z],
      });
      return;
    }
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
    const refId = this.state.selectedReferenceImageId.get();
    if (refId) {
      const ref = this.referenceImages.get(refId);
      if (ref && this.refDragBefore) {
        const after: ReferenceImageTransform = { position: [...ref.position], rotation: [...ref.rotation], scale: [...ref.scale] };
        if (JSON.stringify(this.refDragBefore) !== JSON.stringify(after)) {
          this.history.record(new TransformReferenceImageCommand(this.referenceImages, refId, this.refDragBefore, after, `Transformed ${ref.name}`));
        }
      }
      this.refDragBefore = null;
      return;
    }
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
