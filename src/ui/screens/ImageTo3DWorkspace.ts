import * as THREE from 'three';
import type { App } from '../../core/App';
import type { ReconstructionMode, ReconstructionPreview } from '../../reconstruction/types';
import { pickFile } from '../../utils/download';

const DISABLED_MODES: { mode: ReconstructionMode; label: string }[] = [
  { mode: 'TWO_IMAGES', label: 'Two Images' },
  { mode: 'FOUR_IMAGES', label: 'Four Images' },
  { mode: 'MULTI_VIEW', label: 'Multi-View' },
];

/** IMAGE → 3D workspace: upload → GENERATE 3D (preview only, scene untouched) → CREATE IN SCENE
 * (commits via App.commitReconstruction). Every stage is labeled ESTIMATED — this never claims a
 * single photo produces an exact reconstruction. */
export function openImageTo3DWorkspace(app: App): void {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const box = document.createElement('div');
  box.className = 'modal-box';
  box.style.width = '820px';
  box.style.maxHeight = '86vh';
  box.style.overflowY = 'auto';

  const title = document.createElement('div');
  title.className = 'modal-title';
  title.textContent = 'IMAGE → 3D — ESTIMATED RECONSTRUCTION';

  // --- Mode row: only ONE_IMAGE is real; the rest are present, honest, disabled buttons. ---
  const modeRow = document.createElement('div');
  modeRow.style.cssText = 'display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;';
  const oneImageBtn = document.createElement('button');
  oneImageBtn.className = 'btn active';
  oneImageBtn.style.cssText = 'padding:4px 10px;font-size:11px;';
  oneImageBtn.textContent = 'One Image';
  modeRow.appendChild(oneImageBtn);
  for (const { label } of DISABLED_MODES) {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.style.cssText = 'padding:4px 10px;font-size:11px;';
    btn.textContent = `${label} — Coming Soon`;
    btn.disabled = true;
    modeRow.appendChild(btn);
  }

  // --- Upload row ---
  const uploadRow = document.createElement('div');
  uploadRow.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:14px;';
  const chooseBtn = document.createElement('button');
  chooseBtn.className = 'btn';
  chooseBtn.style.cssText = 'padding:4px 10px;font-size:11px;';
  chooseBtn.textContent = 'Choose Image';
  const fileLabel = document.createElement('span');
  fileLabel.style.cssText = 'font-size:11px;color:var(--text-2);font-family:var(--font-mono);';
  fileLabel.textContent = 'No image selected.';
  const generateBtn = document.createElement('button');
  generateBtn.className = 'btn active';
  generateBtn.style.cssText = 'padding:4px 10px;font-size:11px;margin-left:auto;';
  generateBtn.textContent = 'Generate 3D';
  generateBtn.disabled = true;
  uploadRow.append(chooseBtn, fileLabel, generateBtn);

  const statusLine = document.createElement('div');
  statusLine.style.cssText = 'font-size:11px;color:var(--text-2);margin-bottom:10px;min-height:14px;';

  // Real, objectively-computed pixel facts (never object recognition) shown immediately on
  // upload, before the user spends time generating a preview.
  const factsLine = document.createElement('div');
  factsLine.style.cssText = 'font-size:10px;color:var(--text-2);font-family:var(--font-mono);margin-bottom:10px;display:none;';

  // --- Preview panels: Original / Silhouette / Depth (canvases) + Point Cloud (mini THREE view) ---
  const previewGrid = document.createElement('div');
  previewGrid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;';

  function makePanel(labelText: string): { panel: HTMLElement; canvas: HTMLCanvasElement } {
    const panel = document.createElement('div');
    panel.style.cssText = 'border:1px solid var(--line);border-radius:var(--radius);padding:6px;background:var(--bg-2);';
    const label = document.createElement('div');
    label.style.cssText = 'font-size:10px;color:var(--text-2);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;';
    label.textContent = labelText;
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    canvas.style.cssText = 'width:100%;height:auto;display:block;background:#000;';
    panel.append(label, canvas);
    return { panel, canvas };
  }

  const originalPanel = makePanel('Original');
  const silhouettePanel = makePanel('Silhouette (Estimated)');
  const depthPanel = makePanel('Depth (Estimated)');
  const pointsPanel = makePanel('Point Cloud Preview (Estimated)');
  previewGrid.append(originalPanel.panel, silhouettePanel.panel, depthPanel.panel, pointsPanel.panel);
  previewGrid.style.display = 'none';

  const estimatedNote = document.createElement('div');
  estimatedNote.style.cssText = 'font-size:11px;color:var(--warn,#e0a03c);margin-bottom:14px;display:none;';
  estimatedNote.textContent = 'ESTIMATED 3D RECONSTRUCTION — a single photo cannot produce an exact model. Every dimension shown is an approximation.';

  // --- Mini THREE.js preview renderer for the point cloud (separate from the main viewport) ---
  let previewRenderer: THREE.WebGLRenderer | null = null;
  let previewScene: THREE.Scene | null = null;
  let previewCamera: THREE.PerspectiveCamera | null = null;
  let previewPoints: THREE.Points | null = null;
  let rafId = 0;

  function disposePreviewRenderer(): void {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    if (previewPoints) {
      previewPoints.geometry.dispose();
      (previewPoints.material as THREE.Material).dispose();
    }
    previewRenderer?.dispose();
    previewRenderer = null;
    previewScene = null;
    previewCamera = null;
    previewPoints = null;
  }

  function renderPointCloud(points: Float32Array): void {
    disposePreviewRenderer();
    const canvas = pointsPanel.canvas;
    previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    previewRenderer.setSize(canvas.width, canvas.height, false);
    previewScene = new THREE.Scene();
    previewCamera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
    previewCamera.position.set(0, 0, 2);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const material = new THREE.PointsMaterial({ color: 0x4fd8ff, size: 0.015 });
    previewPoints = new THREE.Points(geometry, material);
    previewScene.add(previewPoints);

    const animate = (): void => {
      if (!previewRenderer || !previewScene || !previewCamera || !previewPoints) return;
      previewPoints.rotation.y += 0.01;
      previewRenderer.render(previewScene, previewCamera);
      rafId = requestAnimationFrame(animate);
    };
    animate();
  }

  function drawImageData(canvas: HTMLCanvasElement, imageData: ImageData): void {
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx?.putImageData(imageData, 0, 0);
  }

  // --- Buttons row ---
  const buttons = document.createElement('div');
  buttons.className = 'modal-buttons';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn';
  cancelBtn.textContent = 'Cancel';
  const createBtn = document.createElement('button');
  createBtn.className = 'btn active';
  createBtn.textContent = 'Create in Scene';
  createBtn.disabled = true;
  buttons.append(cancelBtn, createBtn);

  function close(): void {
    disposePreviewRenderer();
    backdrop.remove();
  }
  cancelBtn.addEventListener('click', close);

  let selectedFile: File | null = null;
  let lastPreview: ReconstructionPreview | null = null;

  chooseBtn.addEventListener('click', async () => {
    const file = await pickFile('image/*');
    if (!file) return;
    selectedFile = file;
    fileLabel.textContent = file.name;
    generateBtn.disabled = false;
    createBtn.disabled = true;
    previewGrid.style.display = 'none';
    estimatedNote.style.display = 'none';
    lastPreview = null;
    factsLine.style.display = 'none';
    try {
      const facts = await app.analyzeImage(file);
      factsLine.textContent = `${facts.width}×${facts.height} (${facts.aspectRatio.toFixed(2)}:1) · avg color ${facts.averageColor} · ${facts.hasAlphaTransparency ? 'has alpha' : 'no alpha'} · ~${facts.foregroundCoveragePercent}% foreground (estimated)`;
      factsLine.style.display = 'block';
    } catch {
      // Non-critical readout — a failure here never blocks the actual reconstruction flow below.
    }
  });

  generateBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    generateBtn.disabled = true;
    statusLine.textContent = 'Generating preview (segmentation → depth → point cloud)…';
    try {
      const preview = await app.previewReconstruction(selectedFile, 'ONE_IMAGE');
      lastPreview = preview;
      drawImageData(originalPanel.canvas, preview.originalImageData);
      drawImageData(silhouettePanel.canvas, preview.silhouetteImageData);
      drawImageData(depthPanel.canvas, preview.depthImageData);
      renderPointCloud(preview.points);
      previewGrid.style.display = 'grid';
      estimatedNote.style.display = 'block';
      createBtn.disabled = false;
      statusLine.textContent = 'Preview ready. The scene is unchanged until you click "Create in Scene".';
    } catch (err) {
      statusLine.textContent = err instanceof Error ? err.message : 'Reconstruction preview failed.';
    } finally {
      generateBtn.disabled = false;
    }
  });

  createBtn.addEventListener('click', async () => {
    if (!selectedFile || !lastPreview) return;
    createBtn.disabled = true;
    statusLine.textContent = 'Creating scene object…';
    try {
      await app.commitReconstruction(selectedFile, 'ONE_IMAGE');
      close();
    } catch (err) {
      statusLine.textContent = err instanceof Error ? err.message : 'Failed to create the reconstruction.';
      createBtn.disabled = false;
    }
  });

  box.append(title, modeRow, uploadRow, factsLine, statusLine, previewGrid, estimatedNote, buttons);
  backdrop.appendChild(box);
  document.body.appendChild(backdrop);
}
