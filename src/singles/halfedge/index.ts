import { GUI } from "dat.gui";
import setupRandom from "@tatumcreative/random";
import Simplex from "simplex-noise";
import initializeShortcuts from "lib/shortcuts";
import { HEMesh } from "lib/halfedge";
import {
  Mesh as ThreeMesh,
  MeshPhysicalMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  DoubleSide,
  SphereBufferGeometry,
  MeshBasicMaterial,
  SpotLight,
  DirectionalLight,
  Material,
} from "three";
import {
  guiAddLight,
  heMeshToBufferGeometry,
  guiAddMesh,
  guiMeshPhysicalMaterial,
  triangleMeshToBufferGeometry,
} from "lib/three";
import { vec3 } from "lib/vec-math";
import createIcosphere from "icosphere";

type Config = ReturnType<typeof getConfig>;
type Current = ReturnType<typeof getCurrent>;

{
  const config = getConfig();
  const current = getCurrent(config);

  current.renderer.compile(current.scene, current.camera);

  (window as any).current = current;

  let tick = 0;
  const steps = 1;
  function render(ms: number) {
    tick++;
    if (tick % steps !== 0) {
      return;
    }
    const now = ms / 1000;
    current.dt = Math.min(now - current.time, 100);
    current.time = now;

    update(config, current);

    current.renderer.render(current.scene, current.camera);
  }

  current.renderer.setAnimationLoop(render);
  // render(0);
}

function update(config: Config, current: Current): void {
  //
  current.halfEdges.rotation.x += 0.01 * current.dt;
  current.halfEdges.rotation.y += 0.07 * current.dt;
}

function getConfig() {
  const random = setupRandom();
  const simplex = new Simplex(random);
  const simplex2 = simplex.noise2D.bind(simplex);
  const simplex3 = simplex.noise3D.bind(simplex);

  initializeShortcuts();

  return {
    random,
    simplex2,
    simplex3,
  };
}

function getCurrent(config: Config) {
  const root = document.createElement("div");
  root.classList.add("fullscreen");
  document.body.appendChild(root);
  const { camera, scene, renderer } = setupBasicScene(root);
  const gui = new GUI();

  return {
    start: Date.now() / 1000,
    time: 0,
    dt: 0,
    camera,
    scene,
    renderer,
    gui,
    halfEdges: addHalfEdges(config, scene, gui),
    lights: addLights(scene, gui),
  };
}

function setupBasicScene(root: HTMLDivElement) {
  const fov = 70;
  const { width, height } = root.getBoundingClientRect();
  const camera = new PerspectiveCamera(
    fov,
    width / height, // aspect
    0.01, // near
    20 //
  );
  camera.position.z = 1;

  const scene = new Scene();
  const renderer = new WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
  });

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  function resize(): void {
    const { width, height } = root.getBoundingClientRect();
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  resize();
  root.appendChild(renderer.domElement);
  window.addEventListener("resize", resize, false);

  return { camera, scene, renderer };
}

function addHalfEdges(config: Config, scene: Scene, gui: GUI) {
  const icosphere = createIcosphere(2);
  const heMesh = HEMesh.fromTriangleMesh(icosphere);
  // const heMesh = new HEMesh();
  // const face = heMesh.createFace(
  //   //
  //   [-0.2, -0.2, 0],
  //   [0.2, -0.2, 0],
  //   [-0.2, 0.2, 0]
  // );
  // face.edge.next.addFace([0.2, 0.2, 0]);
  heMesh.computeNormals();

  const material = new MeshPhysicalMaterial({
    name: "Half Edge Material",
    color: "#cd8063",
    emissive: "#222222",
    roughness: 0.55,
    metalness: 1,
    reflectivity: 0.7,
    clearcoat: 1,
    clearcoatRoughness: 0,
    // side: DoubleSide,
  });

  const geometry = heMeshToBufferGeometry(heMesh);

  const object = new ThreeMesh(geometry, material);
  object.scale.multiplyScalar(0.4);
  object.name = "Half Edge Object";

  guiAddMesh(gui, object);
  guiMeshPhysicalMaterial(gui, material);
  scene.add(object);
  createHEMeshDebug(object, heMesh);

  return object;
}

/**
 *       Example face:         Debug Arrow:
 *            ←
 *           ____--- b             k
 *     c ----       /            //|
 *      \        /             / / |
 *     ↘ \     /   ↗          l-m  |
 *        \  /                   \ |
 *         a                      \|
 *                                 j
 */
function createHEMeshDebug(heObject: ThreeMesh, heMesh: HEMesh) {
  const triMesh: TriangleMesh = {
    positions: [],
    cells: [],
  };
  const inset = 0.025;
  for (const face of heMesh.faces) {
    for (const edge of face) {
      const len = triMesh.positions.length;

      const jI = len;
      const kI = len + 1;
      const lI = len + 2;
      const mI = len + 3;

      triMesh.cells.push([jI, kI, mI]);
      triMesh.cells.push([kI, lI, mI]);

      const a = edge.startPoint();
      const b = edge.next.startPoint();
      const c = edge.next.next.startPoint();

      const j = vec3.create();
      vec3.lerp(j, a, b, inset);
      vec3.lerp(j, j, c, inset);

      const k = vec3.create();
      vec3.lerp(k, a, b, 1 - inset);
      vec3.lerp(k, k, c, inset);

      const l = vec3.create();
      vec3.lerp(l, a, b, 1 - inset * 2);
      vec3.lerp(l, l, c, inset * 3);

      const m = vec3.create();
      vec3.lerp(m, a, b, 1 - inset * 2);
      vec3.lerp(m, m, c, inset * 2);

      triMesh.positions.push(j, k, l, m);
    }
  }
  const geometry = triangleMeshToBufferGeometry(triMesh);
  const material = new MeshBasicMaterial({
    color: "#ff0000",
    side: DoubleSide,
  });
  material.depthTest = false;
  const triObject = new ThreeMesh(geometry, material);
  (heObject.material as any).wireframe = true;

  heObject.add(triObject);
}

function addLights(scene: Scene, gui: GUI) {
  const lights = [];
  function setupShadows(light: SpotLight) {
    light.castShadow = false;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 20;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
  }

  {
    // Main light from the top.
    const light = new SpotLight("#f5eede", 0.7);
    light.name = "Main Light";
    light.position.set(6.7, 9, 0.1);
    light.castShadow = true;
    guiAddLight(gui, light, 100);
    setupShadows(light);
    lights.push(light);
    scene.add(light);
  }

  {
    // Rim light to the right
    const light = new DirectionalLight("#ffc156", 0.25);
    light.name = "Rim Light";
    light.position.set(5.1, -0.4, -4.2);
    light.castShadow = false;
    guiAddLight(gui, light);
    scene.add(light);
    lights.push(light);
  }

  {
    // Fill light from the back left.
    const light = new DirectionalLight("#2cc085", 0.18);
    light.name = "FIll Light";
    light.position.set(-0.9, -0.2, 1.8);
    light.castShadow = false;
    light.intensity = 1.16;
    guiAddLight(gui, light);
    scene.add(light);
    lights.push(light);
  }
  return lights;
}
