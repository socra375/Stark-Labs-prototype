# IMAGE WORKFLOWS: IMAGE → 3D and IMAGE → BUILD

Two distinct workflows share the "Image" entry point in the header, and must not be confused: **Image → 3D** turns a photo into estimated geometry; **Image → Build** turns a photo into a non-geometry visual reference the user builds primitives over by hand. A failure in one never affects the other — they don't share any mutable state beyond both ultimately storing their source photo as an `AssetRecord`.

## Image → 3D

### Why this MVP is what it is

No client-side ML segmentation is realistic in a browser with no model runtime, and fabricating that capability would violate this project's "never fake it" rule. The MVP is instead a **deterministic `<canvas>` pipeline** — every stage is real, computed, and labeled ESTIMATED, never presented as an exact or measured reconstruction.

### Pipeline (`src/reconstruction/`)

```
decodeAndDownscale(file)        — decode + downscale to ≤512px on the longest side (segmentation.ts)
  → segmentForeground(image)    — real alpha threshold if the source has transparency; otherwise
                                    chroma-key against the sampled border color + border flood-fill +
                                    one morphological-closing pass (segmentation.ts)
  → chamferDepthField(mask)     — two-pass chamfer distance transform, normalized [0,1] — the
                                    standard "rounded blob from a silhouette" heuristic; an
                                    approximation, always labeled ESTIMATED (depth.ts)
  → buildPillowGeometry(depth)  — a front + mirrored-back heightfield stitched with a rim, a real
                                    BufferGeometry with computed normals — not a flat relief that
                                    would look fake from the side (mesh.ts)
```

`buildPreviewPointCloud()` renders a cheap `THREE.Points` cloud before the full mesh is stitched, matching the required two-step UI flow: **GENERATE 3D** (preview only — decode/segment/depth/point-cloud, the live scene is untouched) → **CREATE IN SCENE** (commits — builds the full pillow mesh, only now touching `ObjectManager`).

### Engine architecture

`ReconstructionEngine` (`src/reconstruction/types.ts`) mirrors `AIProvider`'s id/label/available shape — `preview()`/`generate()`, swappable via a `ReconstructionService` facade (mirrors `AIService`), so a future heavier engine replaces `HeightfieldReconstructionEngine` without touching the rest of the app. `ReconstructionInput.mode` is a real enum (`ONE_IMAGE`/`TWO_IMAGES`/`FOUR_IMAGES`/`MULTI_VIEW`); only `ONE_IMAGE` is wired to a real engine — the other three render as real, present, disabled "Coming Soon" buttons in the workspace, not hidden and not fake.

`ReconstructionResult.components?: ReconstructionComponent[]` is future-proofing only — always `undefined` for this MVP engine (`componentDetection` stays `'single-object'`); the shape exists so a future smarter engine could return real per-part results without `ImageTo3DWorkspace`'s consumption code changing.

### Committed result

`ReconstructionCommitCommand` (mirrors `ImportCommand`) inserts the source-image `AssetRecord`, the geometry `AssetRecord`, a default `custom` `MaterialDefinition`, and a `SceneObject` named "Reconstruction (Estimated)" with `metadata:{origin:'reconstruction', reconstruction:{estimated:true, sourceImageAssetId, method, componentDetection:'single-object'}}`. From that point on it's an ordinary mesh — transform/mirror/Join/Separate/save/export/AI commands all work on it exactly like a primitive.

### Real facts, shown honestly (M22)

`analyzeImage()` (`src/ai/ImageAnalysis.ts`, see AI_TOOLS.md) reuses this same segmentation pipeline to report real pixel statistics (dimensions, alpha presence, average color, foreground coverage) immediately on upload — never object recognition.

## Image → Build (reference-image mode)

The photo becomes a `ReferenceImage` — explicitly **not** a `SceneObject`, never touched by Join/Separate/Mirror/`AnalysisEngine`, never contributing geometry. See DATA_MODEL.md for its shape and ARCHITECTURE.md for why its `rotation` is a `Quat`, not the Euler `Vec3` every `SceneObject` uses.

### Rendering and interaction

`ReferenceImageVisualizer` (`src/3d/ReferenceImageVisualizer.ts`) builds a `THREE.Mesh` on a `PlaneGeometry` immediately on creation (transformable/selectable right away), then asynchronously resolves the source image asset to a texture (never blocking). It's picked via a second `PickRaycaster.pick()` pass against its own group when the main scene raycast misses, and shares the same `TransformGizmo` as `SceneObject`s — `AppState.selection`/`selectedReferenceImageId` are kept mutually exclusive by two cross-subscriptions, so exactly one kind of selection ever has the gizmo attached.

### Commands

`CreateReferenceImageCommand` / `TransformReferenceImageCommand` / `DeleteReferenceImageCommand` (`src/editor/commands/`) give the reference image the same undo/redo discipline as everything else — including a delete/undo cycle that restores the real underlying image asset, not just the record.

### Panel

`ReferenceImagesPanel` lists every reference image with rename/opacity/visible/locked/delete controls — deliberately separate from the `Inspector` (which is a `SceneObject`-only two-way binding) rather than overloading it with conditional branches for a fundamentally different kind of thing.

## What's explicitly not attempted

Multi-image/multi-view reconstruction; real ML component segmentation from one photo; a working geometry-editing layer on the resulting mesh (see ARCHITECTURE.md's geometry-editing boundary — interfaces only, honestly `not_implemented`).
