import { GUI } from "dat.gui";
import {
  PerspectiveCamera,
  Scene,
  Mesh,
  Color,
  WebGLRenderer,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  DirectionalLight,
  CanvasTexture,
  IcosahedronBufferGeometry,
  TextureLoader,
  Fog,
  PointLight,
  SpotLight,
  PlaneGeometry,
} from "three";
import { simplex } from "lib/shaders";
import * as THREE from "three";
import * as Quads from "lib/quads";
import { vec3 } from "gl-matrix";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

import { generateSeed } from "lib/draw";
import setupRandom from "@tatumcreative/random";
import initializeShortcuts from "lib/shortcuts";
import Simplex from "simplex-noise";
import {
  guiAddLight,
  guiMeshPhysicalMaterial,
  guiAddMesh,
  ShaderInjector,
  quadMeshToBufferGeometry,
  triangleMeshToBufferGeometry,
} from "lib/three";
import {
  addGeometryToTriangleMesh,
  getEmptyTriangleMesh,
} from "lib/triangle-meshes";
import { PipeNetwork, PipeNetworkConfig } from "lib/pipe-network";

const ORIGIN = vec3.create();

type Config = ReturnType<typeof getConfig>;
type Current = ReturnType<typeof getCurrent>;

{
  const config = getConfig();
  const current = getCurrent(config);

  current.renderer.compile(current.scene, current.camera);

  (window as any).current = current;

  function render(ms: number) {
    const now = ms / 1000;
    current.dt = Math.min(now - current.time, 100);
    current.time = now;

    current.screenShader.uniforms.time.value = now;

    update(config, current);

    current.composer.render();
  }

  current.renderer.setAnimationLoop(render);
  // render(0);
}

function getConfig() {
  const seed = generateSeed();
  const random = setupRandom(seed);
  const simplex = new Simplex(random);
  const simplex2 = simplex.noise2D.bind(simplex);
  const simplex3 = simplex.noise3D.bind(simplex);

  initializeShortcuts(seed);
  const d = 1;

  return {
    seed,
    random,
    simplex2,
    simplex3,
    pipeSubdivide: 1,
    pipeNetwork: {
      dimensions: [10, 10, 10] as Tuple3,
      pipeLengths: [20 / 1000, 20 / 1000, 40 / 1000],
      pipeRadius: 5 / 1000,
      desiredNodeCount: { ratio: 0.25 },
      seed: "850123456789",
    } as PipeNetworkConfig,
    background: "#c5c4c0",
  };
}

function getCurrent(config: Config) {
  const root = document.createElement("div");
  root.classList.add("fullscreen");
  document.body.appendChild(root);

  const { camera, scene, renderer } = setupBasicScene(root);

  scene.fog = new Fog(config.background, -2, 10);
  scene.background = new Color(config.background);

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const screenShader = new ShaderPass(getScreenShader());
  composer.addPass(screenShader);
  composer.setPixelRatio(window.devicePixelRatio);

  camera.rotation.x = 0.0;
  camera.position.z = 1;

  const gui = new GUI();
  const shaderInjector = new ShaderInjector();

  const pointLight = addLights(scene, gui);
  // gui.hide();

  // Mutable state.
  return {
    start: Date.now() / 1000,
    time: 0,
    dt: 0,
    scene,
    camera,
    renderer,
    root,
    composer,
    screenShader,
    shaderInjector,
    gui,
    pipeNetwork: addPipeNetwork(config, shaderInjector, scene, gui),
    floor: addFloor(config, scene),
  };
}

function update(config: Config, current: Current): void {
  current.shaderInjector.update(config, current);

  const prevTime = current.time;
  current.time = Date.now() / 1000 - current.start;
  current.dt = current.time - prevTime;

  const t =
    0 * 0 +
    (0.5 * Math.sin(current.time * 7) + 0.5) +
    (0.5 * Math.sin(current.time * 20) + 0.5) +
    (0.5 * Math.sin(current.time * 47) + 0.5);

  // current.pipeNetwork.rotation.y += 0.01;

  {
    const { simplex2 } = config;
    const { camera, time } = current;
    camera.position.x = simplex2(time * 0.1, 0) * 0.05;
    camera.position.y = simplex2(time * 0.1, 100) * 0.05;
    camera.rotation.z = simplex2(time * 0.05, 200) * 0.05;
  }
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
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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

function addLights(scene: Scene, gui: GUI) {
  function setupShadows(light: SpotLight) {
    light.castShadow = true;
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
  }
}

type CanvasCallback = (ctx: CanvasRenderingContext2D) => void;
function createCanvasTexture(
  canvasWidth: number,
  callback: CanvasCallback
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasWidth;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    throw new Error("Could not get a 2d context.");
  }
  const texture = new CanvasTexture(canvas);

  callback(ctx);
  return texture;
}

function getScreenShader() {
  return {
    uniforms: {
      tDiffuse: {
        value: null,
      },
      time: {
        value: 1,
      },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float time;
      uniform sampler2D tDiffuse;
      varying vec2 vUv;

      ${simplex}

      void main() {
        vec2 uv = vUv;
        vec3 color = texture2D(tDiffuse, uv).rgb;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  };
}

function addPipeNetwork(
  config: Config,
  shaderInjector: ShaderInjector,
  scene: Scene,
  gui: GUI
) {
  const network = new PipeNetwork(config.pipeNetwork);

  Quads.mergePositions(network.mesh);
  if (config.pipeSubdivide) {
    Quads.subdivide(network.mesh, config.pipeSubdivide);
  }
  Quads.computeSmoothNormals(network.mesh);

  const material = new MeshPhysicalMaterial({
    name: "Pipes Material",
    color: 0xcd8063,
    emissive: "#000000",
    roughness: 0.55,
    metalness: 1,
    reflectivity: 0.7,
    clearcoat: 1,
    clearcoatRoughness: 0,
  });

  material.wireframe = false;
  const geometry = quadMeshToBufferGeometry(network.mesh);
  guiMeshPhysicalMaterial(gui, material);

  // for (let i = 0; i < 10; i++) {
  const pipesMesh = new Mesh(geometry, material);
  pipesMesh.name = "Pipe Mesh";
  guiAddMesh(gui, pipesMesh);

  scene.add(pipesMesh);
  pipesMesh.scale.multiplyScalar(1.3);
  // pipesMesh.scale.multiplyScalar(2.6);
  // pipesMesh.position.x = 0.0 + i * 0.4 - 2;
  // pipesMesh.position.y = -0.55;
  // pipesMesh.position.z = -3.9 + Math.sin(i) * 0.1;
  // pipesMesh.rotation.z = Math.PI * i;
  // pipesMesh.rotation.y = Math.PI * Math.floor(i * 0.5);
  pipesMesh.castShadow = true;
  pipesMesh.receiveShadow = true;
  // }
}

function addFloor(config: Config, scene: Scene) {
  const geometry = new PlaneGeometry(100, 100);
  const material = new MeshBasicMaterial({
    color: "#000000",
  });
  const mesh = new Mesh(geometry, material);
  mesh.rotation.x += Math.PI * 1.5;
  mesh.position.y = -1;
  scene.add(mesh);
  return mesh;
}
