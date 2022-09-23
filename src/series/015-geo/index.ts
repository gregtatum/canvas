import { GUI } from "dat.gui";
import {
  PerspectiveCamera,
  Scene,
  Mesh,
  WebGLRenderer,
  PlaneGeometry,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  CircleGeometry,
  DirectionalLight,
  CanvasTexture,
  IcosahedronBufferGeometry,
  TextureLoader,
} from "three";
import { simplex } from "lib/shaders";
import * as THREE from "three";
import lerp from "lerp";
import * as quads from "lib/quads";
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
  ShaderInjector,
  quadMeshToBufferGeometry,
  triangleMeshToBufferGeometry,
  guiAddMesh,
} from "lib/three";
import {
  addGeometryToTriangleMesh,
  getEmptyTriangleMesh,
} from "lib/triangle-meshes";

const ORIGIN = vec3.create();

type Config = ReturnType<typeof getConfig>;
type Current = ReturnType<typeof getCurrent>;

{
  const config = getConfig();
  const current = getCurrent(config);

  (window as any).current = current;

  current.renderer.setAnimationLoop((ms) => {
    const now = ms / 1000;
    current.dt = Math.min(now - current.time, 100);
    current.time = now;

    current.screenShader.uniforms.time.value = now;

    update(config, current);

    current.composer.render();
  });
}

function getConfig() {
  const seed = generateSeed();
  const random = setupRandom(seed);
  const simplex = new Simplex(random);
  const simplex2 = simplex.noise2D.bind(simplex);
  const simplex3 = simplex.noise3D.bind(simplex);

  initializeShortcuts(seed);

  return {
    seed,
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
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const screenShader = new ShaderPass(getScreenShader());
  composer.addPass(screenShader);
  composer.setPixelRatio(window.devicePixelRatio);
  scene.background = new THREE.Color("#333333");

  camera.rotation.x = 0.4;

  const gui = new GUI();
  addLights(scene, gui);

  const shaderInjector = new ShaderInjector();

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
    sphere: addSphere(config, shaderInjector, scene, gui),
  };
}

function update(config: Config, current: Current): void {
  current.shaderInjector.update(config, current);

  const prevTime = current.time;
  current.time = Date.now() / 1000 - current.start;
  current.dt = current.time - prevTime;
  current.sphere.rotation.y += 0.005;
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

function addLights(scene: Scene, gui: GUI): void {
  {
    // Main light from the top.
    const light = new DirectionalLight("#f5eede", 0.7);
    light.name = "Main Light";
    light.position.set(3, 8, 4.3);
    light.castShadow = false;
    guiAddLight(gui, light);
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
    const light = new DirectionalLight("#b2ffe4", 0.18);
    light.name = "FIll Light";
    light.position.set(-2, -5.7, 2.2);
    light.castShadow = false;
    guiAddLight(gui, light);
    scene.add(light);
  }

  // const ambient = new THREE.AmbientLight(0xa6c09a);
  // ambient.intensity = 0.7;
  // scene.add(ambient);
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
        vec3 color = texture2D( tDiffuse, uv ).rgb;
        float d = distance(vec2(0.5, 0.5), uv) * 2.0;

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  };
}

function addSphere(
  config: Config,
  shaderInjector: ShaderInjector,
  scene: Scene,
  gui: GUI
) {
  const geometry = new IcosahedronBufferGeometry(1, 10);

  const textureLoader = new TextureLoader();
  const w = 1024;
  const material = new MeshPhysicalMaterial({
    name: "Sphere Material",
    color: "#A0A97f",
    emissive: "#000000",
    roughness: 0.55,
    metalness: 0.12,
    reflectivity: 0.7,
    clearcoat: 0.43,
    clearcoatRoughness: 0.57,
  });

  const sphere = new Mesh(geometry, material);
  sphere.name = "Sphere Mesh";
  guiMeshPhysicalMaterial(gui, material);
  guiAddMesh(gui, sphere);

  // See:
  //   src/lib/threejs-shaders/MeshPhysicalMaterial-frag-v125.glsl
  //   src/lib/threejs-shaders/MeshPhysicalMaterial-vert-v125.glsl
  shaderInjector.inject(sphere, {
    uniforms: {
      time: (config: Config, current: Current) => current.time,
    },
    vertHeader: /* glsl */ `
      ${simplex}
      uniform float time;
    `,
    objectNormal: /* glsl */ `
      // float _offset = sin(position.x * 5.0 + time) + sin(position.y * 20.0 + time);
      // float _wave = sin(time + 10.0 * position.y + 2.5 + _offset) * 0.5;
      // objectNormal.y += (0.5 + _wave) * 0.5;
      float _noise = simplex(vec4(position * 10.0, time)) * 0.2;
      objectNormal.y += _noise;
      objectNormal = normalize(objectNormal);
    `,
    transformed: /* glsl */ `
      // transformed *= 1.0 + (0.5 + sin(time + 10.0 * transformed.y + 2.5) * 0.5) * 0.2;
      transformed *= 1.0 + _noise * 0.1;
    `,
    gl_FragColor: /* glsl */ `
      // gl_FragColor.r = 1.0;
    `,
  });

  scene.add(sphere);
  sphere.position.x = 0.8;
  sphere.position.y = 2.3;
  sphere.position.z = -5;
  sphere.scale.multiplyScalar(1.6);

  return sphere;
}
