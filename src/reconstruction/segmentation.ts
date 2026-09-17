export interface DecodedImage {
  width: number;
  height: number;
  imageData: ImageData;
}

/** Step 1 of the pipeline: decode the uploaded file and downscale so the longest side is at most
 * maxDim, keeping the rest of the pipeline (segmentation/distance-transform/mesh) cheap. */
export async function decodeAndDownscale(file: File, maxDim = 512): Promise<DecodedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return { width, height, imageData: ctx.getImageData(0, 0, width, height) };
}

/**
 * Step 2: a real, deterministic foreground mask — never a fabricated "AI segmentation" result.
 * Uses real alpha transparency when the source image has any (alpha thresholding); otherwise
 * chroma-keys against the sampled border color, flood-filling from the border over
 * background-like pixels so a background-colored patch fully enclosed by the foreground is never
 * mistaken for background. One morphological-closing pass removes small holes/speckle.
 */
export function segmentForeground(image: DecodedImage): Uint8ClampedArray {
  const { width, height, imageData } = image;
  const data = imageData.data;
  const n = width * height;

  let hasTransparency = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) {
      hasTransparency = true;
      break;
    }
  }

  if (hasTransparency) {
    const mask = new Uint8ClampedArray(n);
    for (let i = 0; i < n; i++) mask[i] = data[i * 4 + 3] > 127 ? 255 : 0;
    return morphClose(mask, width, height);
  }

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;
  const sampleBorder = (x: number, y: number): void => {
    const idx = (y * width + x) * 4;
    rSum += data[idx];
    gSum += data[idx + 1];
    bSum += data[idx + 2];
    count++;
  };
  for (let x = 0; x < width; x++) {
    sampleBorder(x, 0);
    sampleBorder(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    sampleBorder(0, y);
    sampleBorder(width - 1, y);
  }
  const avgR = rSum / count;
  const avgG = gSum / count;
  const avgB = bSum / count;
  const threshold = 40;

  const backgroundLike = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const idx = i * 4;
    const dr = data[idx] - avgR;
    const dg = data[idx + 1] - avgG;
    const db = data[idx + 2] - avgB;
    backgroundLike[i] = Math.sqrt(dr * dr + dg * dg + db * db) <= threshold ? 1 : 0;
  }

  const visited = new Uint8Array(n);
  const stack: number[] = [];
  const seed = (i: number): void => {
    if (backgroundLike[i]) stack.push(i);
  };
  for (let x = 0; x < width; x++) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    seed(y * width);
    seed(y * width + (width - 1));
  }
  while (stack.length) {
    const i = stack.pop()!;
    if (visited[i]) continue;
    visited[i] = 1;
    const x = i % width;
    const y = (i / width) | 0;
    if (x > 0 && !visited[i - 1] && backgroundLike[i - 1]) stack.push(i - 1);
    if (x < width - 1 && !visited[i + 1] && backgroundLike[i + 1]) stack.push(i + 1);
    if (y > 0 && !visited[i - width] && backgroundLike[i - width]) stack.push(i - width);
    if (y < height - 1 && !visited[i + width] && backgroundLike[i + width]) stack.push(i + width);
  }

  const mask = new Uint8ClampedArray(n);
  for (let i = 0; i < n; i++) mask[i] = visited[i] ? 0 : 255;
  return morphClose(mask, width, height);
}

function morphClose(mask: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  return erode(dilate(mask, width, height), width, height);
}

function dilate(mask: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = 0;
      for (let dy = -1; dy <= 1 && !v; dy++) {
        for (let dx = -1; dx <= 1 && !v; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height && mask[ny * width + nx]) v = 255;
        }
      }
      out[y * width + x] = v;
    }
  }
  return out;
}

function erode(mask: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = 255;
      for (let dy = -1; dy <= 1 && v; dy++) {
        for (let dx = -1; dx <= 1 && v; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height || !mask[ny * width + nx]) v = 0;
        }
      }
      out[y * width + x] = v;
    }
  }
  return out;
}

/** Renders a 0/255 mask as a grayscale ImageData for the "Silhouette" preview panel. */
export function maskToImageData(mask: Uint8ClampedArray, width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = mask[i];
    data[i * 4 + 1] = mask[i];
    data[i * 4 + 2] = mask[i];
    data[i * 4 + 3] = 255;
  }
  return new ImageData(data, width, height);
}
