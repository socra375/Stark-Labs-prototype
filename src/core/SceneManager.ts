import * as THREE from 'three';

/** Owns the THREE.Scene, lighting rig, grid and axes helpers. */
export class SceneManager {
  readonly scene: THREE.Scene;
  readonly objectRoot: THREE.Group;
  private grid: THREE.GridHelper;
  private axes: THREE.AxesHelper;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e14);
    this.scene.fog = new THREE.Fog(0x0a0e14, 20, 60);

    this.objectRoot = new THREE.Group();
    this.objectRoot.name = 'objectRoot';
    this.scene.add(this.objectRoot);

    const hemi = new THREE.HemisphereLight(0x8fb8ff, 0x1a1f2b, 0.6);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(5, 8, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 30;
    key.shadow.camera.left = -10;
    key.shadow.camera.right = 10;
    key.shadow.camera.top = 10;
    key.shadow.camera.bottom = -10;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x4fd8ff, 0.4);
    fill.position.set(-6, 3, -4);
    this.scene.add(fill);

    this.grid = new THREE.GridHelper(20, 40, 0x2a8fb8, 0x1d2736);
    this.scene.add(this.grid);

    this.axes = new THREE.AxesHelper(1.5);
    this.scene.add(this.axes);

    const groundGeo = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.25 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  setGridVisible(visible: boolean): void {
    this.grid.visible = visible;
    this.axes.visible = visible;
  }
}
