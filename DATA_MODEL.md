# DATA MODEL

All shapes are defined in `src/core/types.ts` unless noted.

## SceneObject

The single node type for both meshes and groups.

```ts
interface SceneObject {
  id: string;
  name: string;
  type: 'group' | 'mesh';
  geometry?: { type: 'box'|'sphere'|'cylinder'|'cone'|'capsule'|'plane'|'torus'|'imported'; params: Record<string, number>; assetId?: string };
  material?: string;              // MaterialDefinition id; undefined for groups
  position: [number, number, number]; // LOCAL, relative to parentId (or world if root)
  rotation: [number, number, number]; // LOCAL, Euler radians, XYZ order
  scale: [number, number, number];    // LOCAL
  parentId: string | null;
  children: string[];
  visible: boolean;
  locked: boolean;
  metadata: {
    role?: string;            // e.g. 'arm', 'leg' — used by AI group-phrase resolution ("both arms")
    symmetryGroup?: string;
    mirrorOf?: string;        // set on a MirrorTool-produced copy, pointing at its source
    mirrorAxis?: 'x' | 'y' | 'z';
    origin?: 'build' | 'import' | 'reconstruction' | 'joined'; // stamped once at creation; drives scene-tree grouping
    joinedFrom?: SceneObject[]; // set only by JoinCommand — deep clones of the originals, enabling lossless Separate
    reconstruction?: { estimated: true; sourceImageAssetId: string; method: string; componentDetection: 'single-object' };
    [key: string]: unknown;
  };
}
```

`geometry.type === 'imported'` covers both real imported models (`.glb`/`.gltf`/`.obj`/`.stl`) and Image→3D reconstructions — both resolve their actual geometry through `assetId` (see `AssetRecord` below), never inline. `position`/`rotation`/`scale` are **always local**. Use `CoordinateSystem` (`src/3d/CoordinateSystem.ts`) to read/write world-space transforms — never convert by hand.

## MaterialDefinition

```ts
interface MaterialDefinition {
  id: string;
  name: string;
  preset: 'metal' | 'plastic' | 'glass' | 'fiber' | 'titanium' | 'carbonFiber' | 'rubber' | 'gold' | 'redMetal' | 'blueMetal' | 'custom';
  color: string;             // hex
  metalness: number;         // 0..1
  roughness: number;         // 0..1
  opacity: number;           // 0..1
  transparent: boolean;
  emissive: string;          // hex
  emissiveIntensity: number;
}
```

Referenced by id from `SceneObject.material` — shared, not copied (see ARCHITECTURE.md). The 6 non-original presets (titanium/carbonFiber/rubber/gold/redMetal/blueMetal) are real color/metalness/roughness values in `MaterialManager.MATERIAL_PRESETS`, kept in sync across `types.ts`, `MaterialsPanel`, `materialTools.ts`, and `MockProvider`'s phrase parser (a `Record` keyed by the non-`'custom'` union in `MaterialManager.ts` enforces this at compile time).

## Connection (Assembly)

```ts
type ConnectionType = 'FIXED' | 'HINGE' | 'SLIDER' | 'FREE';

interface Connection {
  id: string;
  parentObjectId: string;
  childObjectId: string;
  connectionPointA: [number, number, number]; // object-local offset; [0,0,0] unless set explicitly
  connectionPointB: [number, number, number];
  type: ConnectionType; // real, stored data — no physics/kinematics solver runs on it yet
  createdAt: string; // ISO
}
```

Independent of `parentId`/`children` — see ARCHITECTURE.md's Group vs. Assembly vs. Parent/Child section, and [ASSEMBLY_SYSTEM.md](ASSEMBLY_SYSTEM.md).

## AssetRecord

```ts
type AssetKind = 'geometry' | 'sourceFile' | 'sourceImage';

interface AssetRecord {
  id: string;
  kind: AssetKind;
  mimeType: string;
  name: string;
  data: string;      // geometry: BufferGeometry.toJSON() text; sourceFile/sourceImage: base64
  createdAt: string; // ISO
}
```

Owned by `AssetManager` (`src/3d/AssetManager.ts`) — the one place `SceneObject.geometry:{type:'imported'}` and `ReferenceImage.assetId` resolve through. `getGeometry()` always returns a fresh `.clone()`, so no two meshes ever share a mutable geometry instance.

## ReferenceImage (Image → Build)

```ts
type Quat = [number, number, number, number]; // x, y, z, w — THREE.Quaternion order

interface ReferenceImage {
  id: string;
  assetId: string;   // AssetRecord (kind: 'sourceImage')
  name: string;
  position: [number, number, number];
  rotation: Quat;    // NOT Euler — a reference plane needs free 3D rotation, no gimbal lock
  scale: [number, number, number];
  opacity: number;
  visible: boolean;
  locked: boolean;
}
```

Deliberately **not** a `SceneObject` — see ARCHITECTURE.md. Owned by `ReferenceImageManager`, a parallel per-project collection with its own CRUD/event shape, never touched by Join/Separate/Mirror/`AnalysisEngine`.

## SavedModel (Library: My Models / My Parts)

```ts
interface SavedModel {
  id: string;
  kind: 'model' | 'part';
  name: string;
  category?: string;        // 'part' entries only
  thumbnail?: string;       // reserved; nothing generates one yet
  createdAt: string;
  updatedAt: string;
  version: number;
  snapshot: { components: SceneObject[]; materials: MaterialDefinition[]; assemblies: Connection[]; assets: AssetRecord[] };
}
```

A `'model'` entry is typically a whole scene's worth of roots; a `'part'` entry is a single selection's subtree, captured via `capturePartSnapshot()` (only the objects/materials/assets that selection actually uses — never the whole scene). Every insertion via `InsertLibraryItemCommand` gets fresh ids throughout (`remapSavedModelForInsertion()`) — see [LIBRARY.md](LIBRARY.md).

## ProjectMeta / ProjectVersion / HistoryLogEntry

```ts
interface ProjectMeta {
  id: string; name: string; description: string; template: string;
  createdAt: string; updatedAt: string;
  settings: { gridVisible: boolean; snapEnabled: boolean; snapStep: number };
}

interface ProjectVersion {
  id: string; projectId: string; name: string; createdAt: string;
  snapshot: { components: SceneObject[]; materials: MaterialDefinition[]; assemblies: Connection[]; assets: AssetRecord[]; referenceImages: ReferenceImage[] };
}

interface HistoryLogEntry {
  id: string; projectId: string; timestamp: string; description: string;
}
```

## IndexedDB schema (Dexie v2, `src/storage/Database.ts`)

```
projects:        'id, name, updatedAt'
components:      'id, projectId, parentId'   // SceneObject + projectId
materials:       'id, projectId'             // MaterialDefinition + projectId
assemblies:      'id, projectId, parentObjectId, childObjectId, type'  // Connection + projectId
versions:        'id, projectId, createdAt'  // full snapshot per row
history:         'id, projectId, timestamp'
assets:          'id, projectId, kind'       // AssetRecord + projectId
models:          'id, name, updatedAt'       // SavedModel (kind: 'model' | 'part')
referenceImages: 'id, projectId'             // ReferenceImage + projectId
```

The v1→v2 migration backfills `assemblies[].type = 'FIXED'` for any pre-existing row, so old projects survive. `ProjectRepository.save()` replaces a project's `components`/`materials`/`assemblies`/`assets`/`referenceImages` rows inside one Dexie transaction. `AutosaveService` debounces calls to it (~2s idle) off the `project:dirty` bus event — every manager that mutates state (`ObjectManager`, `MaterialManager`, `AssemblyManager`, `ReferenceImageManager`) emits it, not just `ObjectManager`.

## `.stark` export format (`src/storage/StarkFileFormat.ts`)

```json
{
  "format": "stark-prototype",
  "version": "1.0.0",
  "exportedAt": "2026-01-01T00:00:00.000Z",
  "project": { "id": "...", "name": "...", "description": "...", "template": "...", "createdAt": "...", "updatedAt": "...", "settings": { } },
  "scene": { "rootIds": ["..."] },
  "components": [ /* SceneObject[] */ ],
  "materials": [ /* MaterialDefinition[] */ ],
  "assemblies": [ /* Connection[] */ ],
  "assets": [ /* AssetRecord[] */ ],
  "referenceImages": [ /* ReferenceImage[] */ ]
}
```

Import validates the `format` tag and that every array field is really an array before touching live state, and always lands as a **new** project id (never overwrites an existing project by accident). Real `.glb`/`.gltf`/`.obj`/`.stl` import is implemented — see [IMPORT_SYSTEM.md](IMPORT_SYSTEM.md); glTF *export* is not — see ROADMAP.md.

## AI tool argument shapes

See [AI_TOOLS.md](AI_TOOLS.md) for the full list and the validation/preview/execute pipeline each one runs through. Two representative examples:

```ts
// create_object
{ name: string; geometryType: GeometryType; params?: Record<string, number>; position?: [number,number,number] }

// scale_object — supports a single object OR a resolved group ("both arms")
{ objectId?: string; objectIds?: string[]; factor: number } // factor is relative, e.g. 1.1 = +10%
```
