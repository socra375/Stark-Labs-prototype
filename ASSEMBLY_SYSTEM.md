# ASSEMBLY SYSTEM

Three related-but-distinct systems live under this name: typed Connect/Assembly relationships, geometry-level Join/Separate, and the Construction Mode stage that reuses both.

## Assembly/Connect (typed Connections)

A `Connection` (`AssemblyManager`, see DATA_MODEL.md) is a structural relationship between two objects, independent of `parentId`/`children` — see ARCHITECTURE.md's "Group vs. Assembly vs. Parent/Child" section for why these are kept apart. `type: 'FIXED' | 'HINGE' | 'SLIDER' | 'FREE'` is real, stored data, editable via a dropdown in `AssembliesPanel` — **no physics/kinematics solver runs on it yet** (see `SimulationEngine` in ROADMAP.md); it exists so a future solver has real data to consume without a schema migration. `connectionPointA`/`B` are still placeholders (`[0,0,0]`) — real on-mesh point-picking is future work (ROADMAP.md).

## Join

`JoinTool.planJoin(ids)` (`src/editor/JoinTool.ts`) — mesh-only for this pass; selecting a group, or a mesh with its own children, is a real, explicit error (`{ok:false, error}`), never a silent no-op. For each selected mesh: clone its live geometry, bake in its world matrix via `CoordinateSystem.getWorldMatrix()` (never re-derived), then `BufferGeometryUtils.mergeGeometries([...], false)` — which returns `null` (not a throw) on incompatible attribute sets, surfaced as a real error. The merged object's local transform is computed as "the local transform that renders as world identity" under the objects' common parent (root if they don't share one) via `coords.worldMatrixToLocal(identityMatrix, parentId)` — not literal zero values, which would double-apply a non-root parent's transform onto already-world-baked vertices.

Material = the first selected object's; if any other selected object's material differs, a real warning string is surfaced (`plan.materialWarning`) — nothing is silently blended. `metadata:{origin:'joined', joinedFrom: [...deep clones of the originals]}` is what makes Separate's reversal lossless with zero geometry analysis. `JoinCommand` inserts the merged asset+object, then removes the originals (which, via the existing `object:removed` → `assembly.removeAllForObject()` wiring, cleans up any Connections referencing them for free); `undo()` reverses that order. The originals' own geometry `AssetRecord`s are deliberately **not** removed by `JoinCommand` — they stay present-but-orphaned, ready to be referenced again the instant `SeparateCommand` re-inserts the original `SceneObject`s.

## Separate

`SeparateTool.planSeparate(id)` (`src/editor/SeparateTool.ts`) — exactly two real cases, never a fabricated split:

1. **`metadata.joinedFrom` exists** → restore those exact original snapshots verbatim (their real original ids, not fresh ones).
2. **Otherwise** → a real connected-component analysis over the live geometry's triangle/vertex data. The union-find unions vertices two ways: by shared triangle-index membership, **and** by shared 3D position (quantized to 6 decimal places) — because standard geometry generators (THREE primitives, most loaders) duplicate vertices per-face for correct per-face normals, so adjacent faces of one solid mesh don't share a vertex *index* even though they share a vertex *position*. Without the position-based union, a plain box would (wrongly) look like 6 disconnected components. `components.size <= 1` → an honest refusal (`'No detectable seams — this object cannot be separated.'`), zero mutation; `>= 2` → each component becomes a real new `SceneObject` with its own extracted geometry, kept at the original's former local position/rotation/scale/parentId.

`SeparateCommand` handles both cases via one unified plan shape. **Ordering matters in both `execute()` and `undo()`**: any geometry asset a re-inserted object references must be inserted *before* the object itself, because `ObjectManager.insert()` fires `object:created` synchronously and `SceneSync.mount()` resolves the geometry asset immediately off that same event (see ARCHITECTURE.md).

## Construction Mode's real PLAN stage

`ConstructionEngine` (`src/construction/`, see ROADMAP.md/ARCHITECTURE.md) mirrors `SimulationEngine`'s real-registry-plus-honest-stub shape for a MODEL→COMPONENTS→VOXELS→LAYERS→PLAN pipeline. MODEL/COMPONENTS/VOXELS/LAYERS have no real logic yet and honestly report `not_implemented`. **PLAN is real** — it reuses `generateConstructionPlan()` (`src/ai/ConstructionPlan.ts`, see AI_TOOLS.md): meshes ordered by hierarchy depth (shallowest/base pieces first), followed by a `CONNECT` step per real `Connection`. `ConstructionExport.formatConstructionPlanText()` renders that real step list as a downloadable `.txt` file — never a fabricated fabrication guide, and explicit that no physics/kinematics have been simulated (a build *order*, not a validated build).

## Manual verification coverage (this session)

Join two boxes with differing materials → real warning surfaced → Undo → both originals back with their original ids/materials → re-Join → Separate (joinedFrom path — exact original ids, not fresh union-find ids) → Undo the separate → merged mesh restored → Separate a genuinely disconnected hand-built geometry → correct real fragments, original removed → Separate a never-joined primitive → honest refusal, zero mutation. All verified live via headless Chromium with zero console errors; see the M20 commit message for the two real bugs this surfaced and fixed (a `SeparateCommand.undo()` asset/object insertion-order bug, and the position-based connectivity fix).
