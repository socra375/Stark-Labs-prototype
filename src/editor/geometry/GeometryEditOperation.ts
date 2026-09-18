/** Future geometry-editing module boundary — interfaces only, nothing real wired up yet. Every
 * operation returns the same honest not-implemented shape as src/simulation/modules.ts; this
 * exists so `SceneObject.geometry:{type:'imported', assetId}` (already the real representation
 * any future edit would mutate in place via AssetManager) has a stable contract to build against
 * later, without forcing a redesign when vertex/face/edge editing is actually implemented. */

export interface VertexSelection {
  kind: 'vertex';
  indices: number[];
}

export interface FaceSelection {
  kind: 'face';
  indices: number[];
}

export interface EdgeSelection {
  kind: 'edge';
  /** [vertexIndexA, vertexIndexB] pairs. */
  pairs: [number, number][];
}

export type GeometrySelection = VertexSelection | FaceSelection | EdgeSelection;

export type GeometryEditOperationName = 'Extrude' | 'Inset' | 'Bevel' | 'Subdivide' | 'Smooth' | 'Decimate';

export interface GeometryEditNotImplementedResult {
  status: 'not_implemented';
  operation: GeometryEditOperationName;
  message: string;
}

export interface GeometryEditOperation {
  readonly name: GeometryEditOperationName;
  execute(assetId: string, selection: GeometrySelection): GeometryEditNotImplementedResult;
}

function stub(name: GeometryEditOperationName): GeometryEditOperation {
  return {
    name,
    execute(): GeometryEditNotImplementedResult {
      return {
        status: 'not_implemented',
        operation: name,
        message: `${name} is not implemented yet — vertex/face/edge geometry editing is a future module, not wired up in this build.`,
      };
    },
  };
}

export const Extrude = stub('Extrude');
export const Inset = stub('Inset');
export const Bevel = stub('Bevel');
export const Subdivide = stub('Subdivide');
export const Smooth = stub('Smooth');
export const Decimate = stub('Decimate');

export const GEOMETRY_EDIT_OPERATIONS: GeometryEditOperation[] = [Extrude, Inset, Bevel, Subdivide, Smooth, Decimate];
