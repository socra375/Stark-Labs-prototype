import * as THREE from 'three';

export interface PillowMeshOptions {
  worldSize?: number;
  thickness?: number;
}

function worldMapper(width: number, height: number, worldSize: number) {
  const scale = worldSize / Math.max(width, height);
  return {
    x: (px: number) => (px - width / 2) * scale,
    // image y grows downward; flip so world Y grows upward, matching every other object in the scene.
    y: (py: number) => (height / 2 - py) * scale,
  };
}

/**
 * Step 4: a "pillow" solid — a front + mirrored-back heightfield over the foreground grid,
 * stitched with a rim at the silhouette boundary. A real, computed BufferGeometry with normals,
 * not a flat relief that would look fake from the side.
 *
 * Front/back main-surface triangle winding is derived exactly (front outward normal +Z, back
 * outward normal -Z). The thin rim strip connecting them is emitted with both winding orders —
 * a deliberate, disclosed simplification: deriving the exact outward normal for each of the four
 * possible boundary directions is unnecessary complexity for an MVP estimated reconstruction, and
 * emitting both orders guarantees the rim is never back-face-culled regardless of viewing angle.
 * computeVertexNormals() still gives every triangle a real, computed normal — this only affects
 * the thin one-pixel-wide seam ring, not the dominant front/back surfaces.
 */
export function buildPillowGeometry(depth: Float32Array, mask: Uint8ClampedArray, width: number, height: number, opts: PillowMeshOptions = {}): THREE.BufferGeometry {
  const worldSize = opts.worldSize ?? 1;
  const thickness = opts.thickness ?? worldSize * 0.3;
  const map = worldMapper(width, height, worldSize);

  const frontIndex = new Int32Array(width * height).fill(-1);
  const backIndex = new Int32Array(width * height).fill(-1);
  const positions: number[] = [];

  const addVertex = (x: number, y: number, z: number): number => {
    positions.push(x, y, z);
    return positions.length / 3 - 1;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!mask[i]) continue;
      const wx = map.x(x);
      const wy = map.y(y);
      const z = depth[i] * thickness * 0.5;
      frontIndex[i] = addVertex(wx, wy, z);
      backIndex[i] = addVertex(wx, wy, -z);
    }
  }

  if (positions.length === 0) {
    throw new Error('No foreground pixels detected — the segmentation found nothing to reconstruct.');
  }

  const indices: number[] = [];
  const at = (x: number, y: number): number => (x >= 0 && x < width && y >= 0 && y < height && mask[y * width + x] ? y * width + x : -1);

  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const i00 = at(x, y);
      const i10 = at(x + 1, y);
      const i01 = at(x, y + 1);
      const i11 = at(x + 1, y + 1);
      if (i00 < 0 || i10 < 0 || i01 < 0 || i11 < 0) continue;
      // front (outward +Z): (i00,i11,i10) and (i00,i01,i11), both CCW as seen from +Z
      indices.push(frontIndex[i00], frontIndex[i11], frontIndex[i10]);
      indices.push(frontIndex[i00], frontIndex[i01], frontIndex[i11]);
      // back (outward -Z): reversed winding of the same split
      indices.push(backIndex[i00], backIndex[i10], backIndex[i11]);
      indices.push(backIndex[i00], backIndex[i11], backIndex[i01]);
    }
  }

  const emitRimQuad = (aFront: number, aBack: number, bFront: number, bBack: number): void => {
    indices.push(aFront, bFront, bBack, aFront, bBack, aBack);
    indices.push(aFront, bBack, bFront, aFront, aBack, bBack);
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width - 1; x++) {
      const a = at(x, y);
      const b = at(x + 1, y);
      if (a < 0 || b < 0) continue;
      const above = at(x, y - 1) >= 0 && at(x + 1, y - 1) >= 0;
      const below = at(x, y + 1) >= 0 && at(x + 1, y + 1) >= 0;
      if (!above || !below) emitRimQuad(frontIndex[a], backIndex[a], frontIndex[b], backIndex[b]);
    }
  }
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width; x++) {
      const a = at(x, y);
      const b = at(x, y + 1);
      if (a < 0 || b < 0) continue;
      const left = at(x - 1, y) >= 0 && at(x - 1, y + 1) >= 0;
      const right = at(x + 1, y) >= 0 && at(x + 1, y + 1) >= 0;
      if (!left || !right) emitRimQuad(frontIndex[a], backIndex[a], frontIndex[b], backIndex[b]);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Cheap point-cloud preview (front points only) rendered before the full mesh is stitched, for
 * the "GENERATE 3D" preview stage. */
export function buildPreviewPointCloud(depth: Float32Array, mask: Uint8ClampedArray, width: number, height: number, opts: PillowMeshOptions = {}): Float32Array {
  const worldSize = opts.worldSize ?? 1;
  const thickness = opts.thickness ?? worldSize * 0.3;
  const map = worldMapper(width, height, worldSize);
  const points: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!mask[i]) continue;
      points.push(map.x(x), map.y(y), depth[i] * thickness * 0.5);
    }
  }
  return new Float32Array(points);
}
