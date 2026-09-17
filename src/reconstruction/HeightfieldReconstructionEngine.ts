import type { ReconstructionEngine, ReconstructionInput, ReconstructionPreview, ReconstructionResult, ReconstructionMode } from './types';
import { decodeAndDownscale, segmentForeground, maskToImageData } from './segmentation';
import { chamferDepthField, depthToImageData } from './depth';
import { buildPillowGeometry, buildPreviewPointCloud } from './mesh';

const METHOD = 'heightfield-chamfer-v1';

/** The only real engine in this build: a deterministic silhouette/depth/heightfield pipeline —
 * see segmentation.ts/depth.ts/mesh.ts for each step. Always produces an ESTIMATED result;
 * component detection is always 'single-object', since no credible client-side technique exists
 * to split one photo into named parts (inventing one would be exactly the fake segmentation the
 * project's rules forbid). */
export class HeightfieldReconstructionEngine implements ReconstructionEngine {
  readonly id = 'heightfield';
  readonly label = 'Heightfield (Estimated)';
  readonly available = true;
  readonly supportedModes: ReconstructionMode[] = ['ONE_IMAGE'];

  async preview(input: ReconstructionInput): Promise<ReconstructionPreview> {
    this.assertSupported(input);
    const decoded = await decodeAndDownscale(input.images[0]);
    const mask = segmentForeground(decoded);
    const depth = chamferDepthField(mask, decoded.width, decoded.height);
    return {
      width: decoded.width,
      height: decoded.height,
      originalImageData: decoded.imageData,
      silhouetteImageData: maskToImageData(mask, decoded.width, decoded.height),
      depthImageData: depthToImageData(depth, mask, decoded.width, decoded.height),
      points: buildPreviewPointCloud(depth, mask, decoded.width, decoded.height),
    };
  }

  async generate(input: ReconstructionInput): Promise<ReconstructionResult> {
    this.assertSupported(input);
    const decoded = await decodeAndDownscale(input.images[0]);
    const mask = segmentForeground(decoded);
    const depth = chamferDepthField(mask, decoded.width, decoded.height);
    const geometry = buildPillowGeometry(depth, mask, decoded.width, decoded.height);
    return { geometry, method: METHOD, componentDetection: 'single-object', components: undefined };
  }

  private assertSupported(input: ReconstructionInput): void {
    if (!this.supportedModes.includes(input.mode)) {
      throw new Error(`${input.mode} is not implemented yet — only ONE_IMAGE reconstruction is available in this build.`);
    }
    if (input.images.length !== 1) {
      throw new Error('ONE_IMAGE mode requires exactly one image.');
    }
  }
}
