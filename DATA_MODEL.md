# DATA MODEL

All shapes are defined in `src/core/types.ts` unless noted.

## SceneObject

The single node type for both meshes and groups.

```ts
interface SceneObject {
  id: string;
  name: string;
  type: 'group' | 'mesh';
  geometry?: { type: 'box'|'sphere'|'cylinder'|'cone'|'capsule'|'plane'|'torus'; params: Record<string, number> };
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
    [key: string]: unknown;
  };
}
```

`position`/`rotation`/`scale` are **always local**. Use `CoordinateSystem` (`src/3d/CoordinateSystem.ts`) to read/write world-space transforms — never convert by hand.

## MaterialDefinition

```ts
interface MaterialDefinition {
  id: string;
  name: string;
  preset: 'metal' | 'plastic' | 'glass' | 'fiber' | 'custom';
  color: string;             // hex
  metalness: number;         // 0..1
  roughness: number;         // 0..1
  opacity: number;           // 0..1
  transparent: boolean;
  emissive: string;          // hex
  emissiveIntensity: number;
}
```

Referenced by id from `SceneObject.material` — shared, not copied (see ARCHITECTURE.md).

## Connection (Assembly)

```ts
interface Connection {
  id: string;
  parentObjectId: string;
  childObjectId: string;
  connectionPointA: [number, number, number]; // object-local offset; [0,0,0] unless set explicitly
  connectionPointB: [number, number, number];
  createdAt: string; // ISO
}
```

Independent of `parentId`/`children` — see ARCHITECTURE.md's Group vs. Assembly vs. Parent/Child section.

## ProjectMeta / ProjectVersion / HistoryLogEntry

```ts
interface ProjectMeta {
  id: string; name: string; description: string; template: string;
  createdAt: string; updatedAt: string;
  settings: { gridVisible: boolean; snapEnabled: boolean; snapStep: number };
}

interface ProjectVersion {
  id: string; projectId: string; name: string; createdAt: string;
  snapshot: { components: SceneObject[]; materials: MaterialDefinition[]; assemblies: Connection[] };
}

interface HistoryLogEntry {
  id: string; projectId: string; timestamp: string; description: string;
}
```

## IndexedDB schema (Dexie, `src/storage/Database.ts`)

```
projects:    'id, name, updatedAt'
components:  'id, projectId, parentId'   // SceneObject + projectId
materials:   'id, projectId'             // MaterialDefinition + projectId
assemblies:  'id, projectId, parentObjectId, childObjectId'  // Connection + projectId
versions:    'id, projectId, createdAt'  // full snapshot per row
history:     'id, projectId, timestamp'
```

`ProjectRepository.save()` replaces a project's `components`/`materials`/`assemblies` rows inside one Dexie transaction. `AutosaveService` debounces calls to it (~2s idle) off the `project:dirty` bus event.

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
  "assemblies": [ /* Connection[] */ ]
}
```

Import validates the `format` tag and that `components`/`materials`/`assemblies` are arrays before touching live state, and always lands as a **new** project id (never overwrites an existing project by accident). 3D interchange formats (glTF/OBJ) are not implemented — see ROADMAP.md.

## AI tool argument shapes

See [AI_TOOLS.md](AI_TOOLS.md) for the full list and the validation/preview/execute pipeline each one runs through. Two representative examples:

```ts
// create_object
{ name: string; geometryType: GeometryType; params?: Record<string, number>; position?: [number,number,number] }

// scale_object — supports a single object OR a resolved group ("both arms")
{ objectId?: string; objectIds?: string[]; factor: number } // factor is relative, e.g. 1.1 = +10%
```
