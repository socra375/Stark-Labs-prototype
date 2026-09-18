import { decodeAndDownscale, segmentForeground } from '../reconstruction/segmentation';

/** Only objectively-computable pixel statistics — never object recognition, since no credible
 * client-side technique exists here and inventing one would violate this project's "never fake
 * it" rule. Reuses the same deterministic segmentation pipeline Image→3D already relies on. */
export interface ImageAnalysisResult {
  width: number;
  height: number;
  aspectRatio: number;
  hasAlphaTransparency: boolean;
  averageColor: string;
  foregroundCoveragePercent: number;
  notes: string[];
}

function toHex(v: number): string {
  return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
}

export async function analyzeImageFacts(file: File): Promise<ImageAnalysisResult> {
  const originalBitmap = await createImageBitmap(file);
  const width = originalBitmap.width;
  const height = originalBitmap.height;
  originalBitmap.close();

  const decoded = await decodeAndDownscale(file);
  const { imageData } = decoded;
  const data = imageData.data;
  const n = decoded.width * decoded.height;

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let hasAlphaTransparency = false;
  for (let i = 0; i < n; i++) {
    const idx = i * 4;
    rSum += data[idx];
    gSum += data[idx + 1];
    bSum += data[idx + 2];
    if (data[idx + 3] < 250) hasAlphaTransparency = true;
  }
  const averageColor = `#${toHex(rSum / n)}${toHex(gSum / n)}${toHex(bSum / n)}`;

  const mask = segmentForeground(decoded);
  let fg = 0;
  for (let i = 0; i < n; i++) if (mask[i]) fg++;
  const foregroundCoveragePercent = Math.round((fg / n) * 1000) / 10;

  return {
    width,
    height,
    aspectRatio: Math.round((width / height) * 1000) / 1000,
    hasAlphaTransparency,
    averageColor,
    foregroundCoveragePercent,
    notes: [
      'No object recognition was performed — these are measured pixel statistics only.',
      'Foreground coverage is estimated using the same deterministic segmentation used by Image→3D (alpha-based when transparency is present, otherwise chroma-key against the sampled border).',
    ],
  };
}
