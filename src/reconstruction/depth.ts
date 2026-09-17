/**
 * Step 3: a two-pass chamfer distance transform over the foreground mask, normalized to [0,1] —
 * each foreground pixel's (approximate) distance to the nearest background pixel. This is the
 * standard "rounded blob from silhouette" heuristic: an approximation, always labeled ESTIMATED,
 * never presented as a measured depth.
 */
export function chamferDepthField(mask: Uint8ClampedArray, width: number, height: number): Float32Array {
  const INF = 1e6;
  const dist = new Float32Array(width * height);
  for (let i = 0; i < dist.length; i++) dist[i] = mask[i] ? INF : 0;

  const ORTH = 1;
  const DIAG = Math.SQRT2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!mask[i]) continue;
      let d = dist[i];
      if (x > 0) d = Math.min(d, dist[i - 1] + ORTH);
      if (y > 0) d = Math.min(d, dist[i - width] + ORTH);
      if (x > 0 && y > 0) d = Math.min(d, dist[i - width - 1] + DIAG);
      if (x < width - 1 && y > 0) d = Math.min(d, dist[i - width + 1] + DIAG);
      dist[i] = d;
    }
  }

  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (!mask[i]) continue;
      let d = dist[i];
      if (x < width - 1) d = Math.min(d, dist[i + 1] + ORTH);
      if (y < height - 1) d = Math.min(d, dist[i + width] + ORTH);
      if (x < width - 1 && y < height - 1) d = Math.min(d, dist[i + width + 1] + DIAG);
      if (x > 0 && y < height - 1) d = Math.min(d, dist[i + width - 1] + DIAG);
      dist[i] = d;
    }
  }

  let max = 0;
  for (let i = 0; i < dist.length; i++) if (mask[i] && dist[i] > max) max = dist[i];
  if (max <= 0) max = 1;

  const normalized = new Float32Array(dist.length);
  for (let i = 0; i < dist.length; i++) normalized[i] = mask[i] ? dist[i] / max : 0;
  return normalized;
}

/** Renders the normalized depth field as a grayscale ImageData for the "Depth" preview panel. */
export function depthToImageData(depth: Float32Array, mask: Uint8ClampedArray, width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const v = mask[i] ? Math.round(depth[i] * 255) : 0;
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  return new ImageData(data, width, height);
}
