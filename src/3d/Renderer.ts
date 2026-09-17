import * as THREE from 'three';

export class Renderer {
  readonly webgl: THREE.WebGLRenderer;
  private container: HTMLElement;
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement) {
    this.container = container;
    this.webgl = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.webgl.outputColorSpace = THREE.SRGBColorSpace;
    this.webgl.shadowMap.enabled = true;
    this.webgl.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.webgl.domElement);
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
  }

  resize(): void {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.webgl.setSize(w, h, false);
  }

  get size(): { width: number; height: number } {
    return { width: this.container.clientWidth || 1, height: this.container.clientHeight || 1 };
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.webgl.render(scene, camera);
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    this.webgl.dispose();
    this.webgl.domElement.remove();
  }
}
