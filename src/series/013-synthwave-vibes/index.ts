import {
  PerspectiveCamera,
  Scene,
  Mesh,
  WebGLRenderer,
  IcosahedronGeometry,
  PlaneGeometry,
  MeshBasicMaterial,
  MeshMatcapMaterial,
  MeshPhysicalMaterial,
  CircleGeometry,
  DirectionalLight,
  CanvasTexture,
  TextureLoader,
} from "three";
import * as THREE from "three";
import lerp from "lerp";

import { generateSeed, setupCanvas } from "lib/draw";
import setupRandom from "@tatumcreative/random";
import initializeShortcuts from "lib/shortcuts";
import Simplex from "simplex-noise";

type Config = ReturnType<typeof getConfig>;
type Current = ReturnType<typeof getCurrent>;

{
  const config = getConfig();
  const current = getCurrent(config);

  (window as any).current = current;

  current.renderer.setAnimationLoop(ms => {
    const now = ms / 1000;
    current.dt = Math.min(now - current.time, 100);
    current.time = now;

    updateMeshes(config, current);
    update2dCanvas(config, current);

    current.renderer.render(current.scene, current.camera);
  });
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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
    groundPosition: -0.5,
    sphereSize: 0.12,
    sphereNoiseScale: 0.1,
    sphereNoiseSpeed: 0.05,
    spherePositions: [
      [-1.0, -0.6],
      [-1, -3.0],
      [-0.3, -0.1],
      [0.1, -1.6],
      [0.7, -0.1],
    ],
    triangleSpeed: 0.4,
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getCurrent(config: Config) {
  const root = document.createElement("div");
  root.classList.add("fullscreen");
  document.body.appendChild(root);

  const { camera, scene, renderer } = setupBasicScene(root);
  camera.rotation.x = 0.08;

  addLights(scene);

  // Mutable state.
  const current = {
    time: Date.now() / 1000,
    dt: 0,
    scene,
    camera,
    renderer,
    root,
    ctx: setup2dCanvas(root),
    groundPlane: addGroundPlane(config, scene),
    background: addBackground(config, scene),
    spheres: addSpheres(config, scene),
    sun: addSun(scene),
  };

  return current;
}

function setup2dCanvas(root: HTMLDivElement): CanvasRenderingContext2D {
  const ctx = setupCanvas({
    container: root,
    alpha: true,
  });
  const { canvas } = ctx;
  canvas.style.background = "transparent";
  return ctx;
}

function update2dCanvas(config: Config, current: Current): void {
  const { ctx, time } = current;
  const { triangleSpeed } = config;
  ctx.clearRect(0, 0, innerWidth, innerHeight);

  ctx.fillStyle = "#000";
  trianglePath(ctx, 0.05);
  ctx.fill();

  {
    const triangleCount = 4;
    for (let i = 0; i < triangleCount; i++) {
      const ui = ((i + time * triangleSpeed) % triangleCount) / triangleCount;
      const height = lerp(0.05, 0.3, ui);
      ctx.fillStyle = "#000";
      ctx.strokeStyle = "#000";
      trianglePathHollow(ctx, height, 1 - lerp(0.3, 0, ui));
      ctx.fill();
    }
  }

  {
    const triangleCount = 5;

    for (let i = 0; i < triangleCount; i++) {
      const ui = ((i + time * triangleSpeed) % triangleCount) / triangleCount;
      const height = lerp(1.5, 3, ui);
      ctx.fillStyle = "#000";
      ctx.strokeStyle = "#000";
      trianglePathHollow(ctx, height, 1 - lerp(0.0, 0.02, ui));
      ctx.fill();
    }
  }
}

function trianglePath(ctx: CanvasRenderingContext2D, size: number): void {
  const w = innerWidth;
  const h = innerHeight;

  const sizePixels = h * size;
  const halfSize = sizePixels * 0.5;
  const height = Math.sqrt(sizePixels * sizePixels - halfSize * halfSize);

  const centerX = w * 0.5;
  const centerY = h * 0.594;

  ctx.beginPath();
  ctx.moveTo(centerX - halfSize, centerY);
  ctx.lineTo(centerX, centerY - height);
  ctx.lineTo(centerX + halfSize, centerY);
  ctx.closePath();
}

function trianglePathHollow(
  ctx: CanvasRenderingContext2D,
  sizeRatio: number,
  widthRatio: number
): void {
  const w = innerWidth;
  const h = innerHeight;

  const size = h * sizeRatio;
  const halfSize = size * 0.5;
  const height = Math.sqrt(size * size - halfSize * halfSize);

  const centerX = w * 0.5;
  const centerY = h * 0.594;

  //       b
  //     /   \
  //    /  e  \
  //   /  / \  \
  //  a__f   d__c
  //

  const clippedWidth = size * (1 - widthRatio);

  const ax = centerX - halfSize,
    ay = centerY,
    bx = centerX,
    by = centerY - height,
    cx = centerX + halfSize,
    cy = centerY,
    dx = cx - clippedWidth,
    dy = centerY,
    ex = centerX,
    ey = by + clippedWidth * 1.73205, // Math.sqrt(3)
    fx = ax + clippedWidth,
    fy = centerY;

  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(cx, cy);
  ctx.lineTo(dx, dy);
  ctx.lineTo(ex, ey);
  ctx.lineTo(fx, fy);
  ctx.closePath();
}

function updateMeshes(config: Config, current: Current): void {
  const {
    simplex2,
    spherePositions,
    sphereNoiseScale,
    sphereNoiseSpeed,
  } = config;
  const { time, spheres, sun } = current;

  for (let i = 0; i < spherePositions.length; i++) {
    const position = spherePositions[i];
    spheres[i].position.x =
      position[0] +
      simplex2(time * sphereNoiseSpeed, i * 10) * sphereNoiseScale;
    spheres[i].position.z =
      position[1] +
      simplex2(time * sphereNoiseSpeed, -i * 10) * sphereNoiseScale;
  }

  const t = simplex2(time * 5, 0) * 0.5 + 1;
  (sun.material as THREE.Material).opacity = lerp(0.9, 1.0, t);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function setupBasicScene(root: HTMLDivElement) {
  const camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  );
  camera.position.z = 1;

  const scene = new Scene();
  const renderer = new WebGLRenderer({ antialias: true });

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  function resize(): void {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  resize();
  root.appendChild(renderer.domElement);
  window.addEventListener("resize", resize, false);

  return { camera, scene, renderer };
}

function addGroundPlane(config: Config, scene: Scene): Mesh {
  const { groundPosition } = config;
  const canvasWidth = 1024;

  const width = 50;
  const geometry = new PlaneGeometry(width, width);
  const material = new MeshPhysicalMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    map: createCanvasTexture(canvasWidth, ctx => {
      {
        // Create the overall distance gradient.
        const gradient = ctx.createLinearGradient(0, 0, 0, canvasWidth);
        gradient.addColorStop(0, "#e3d7bf");
        gradient.addColorStop(1, "#21221e");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1024, 1024);
      }
      {
        // Make a textured surface.
        const baseBrushWidth = 100;
        ctx.fillStyle = "#00000010";
        for (let i = 0; i < 4000; i++) {
          const brushWidth = baseBrushWidth * Math.random();
          const x = Math.random() * canvasWidth - brushWidth / 2;
          const y = Math.random() * canvasWidth - brushWidth / 2;
          ctx.fillRect(x, y, brushWidth, brushWidth);
        }
      }
    }),
    // emissive: 0x241c09,
  });

  const groundPlane = new Mesh(geometry, material);
  groundPlane.receiveShadow = true;
  scene.add(groundPlane);
  groundPlane.rotation.x = Math.PI * -0.5;
  groundPlane.position.y = groundPosition;
  groundPlane.position.z = -width / 4;

  return groundPlane;
}

function addBackground(config: Config, scene: Scene): Mesh {
  const canvasWidth = 1024;
  const width = 30;
  const geometry = new PlaneGeometry(width, width);
  const material = new MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    map: createCanvasTexture(canvasWidth, ctx => {
      {
        // Create the overall distance gradient.
        const gradient = ctx.createLinearGradient(0, 0, 0, canvasWidth);
        gradient.addColorStop(0.1, "#070200");
        gradient.addColorStop(0.4, "#3f3033");
        gradient.addColorStop(0.5, "#979177");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1024, 1024);
      }
      {
        // Make a textured surface.
        const baseBrushWidth = 100;
        ctx.fillStyle = "#00000005";
        for (let i = 0; i < 4000; i++) {
          const brushWidth = baseBrushWidth * Math.random();
          const x = Math.random() * canvasWidth - brushWidth / 2;
          const y = Math.random() * canvasWidth - brushWidth / 2;
          ctx.fillRect(x, y, brushWidth, brushWidth);
        }
      }
    }),
  });

  const groundPlane = new Mesh(geometry, material);
  groundPlane.receiveShadow = true;
  scene.add(groundPlane);
  // groundPlane.rotation.x = Math.PI * -0.5;
  groundPlane.position.y = 0;
  groundPlane.position.z = -9;

  return groundPlane;
}

function addLights(scene: Scene): void {
  const light = new DirectionalLight(0xffffff, 1.5);
  light.position.set(2, 5, 0);
  light.castShadow = true;
  light.shadow.camera.near = 0.1;
  light.shadow.camera.far = 20;
  // light.shadow.bias = -0.000222;
  light.shadow.mapSize.width = 2048;
  light.shadow.mapSize.height = 2048;

  // const helper = new THREE.CameraHelper(light.shadow.camera);
  // scene.add(helper);

  scene.add(light);

  const ambient = new THREE.AmbientLight(0x002255);
  scene.add(ambient);
}

function addSpheres(config: Config, scene: Scene): Mesh[] {
  const { sphereSize, groundPosition, spherePositions } = config;

  const geometry = new IcosahedronGeometry(sphereSize, 5);
  // const material = new MeshPhysicalMaterial({
  //   color: 0xffffff,
  //   emissive: 0x1d2126,
  //   metalness: 0.8,
  //   roughness: 0.4,
  //   reflectivity: 0.74,
  //   clearcoat: 0.6,
  // });

  const textureLoader = new TextureLoader();
  const material = new MeshMatcapMaterial({
    // matcap: textureLoader.load("../html/matcap/blender.png"),
    matcap: textureLoader.load("../html/matcap/thuglee-chrome-02b.jpg"),
  });

  const spheres = [];

  for (const [x, z] of spherePositions) {
    const sphere = new Mesh(geometry, material);
    sphere.position.x = x;
    sphere.position.y = groundPosition + sphereSize;
    sphere.position.z = z;
    sphere.castShadow = true;
    scene.add(sphere);
    spheres.push(sphere);
  }

  return spheres;
}

function addSun(scene: Scene): Mesh {
  const geometry = new CircleGeometry(0.15, 32);
  const w = 128;
  const material = new MeshBasicMaterial({
    color: 0xa2482d,
    side: THREE.DoubleSide,
    transparent: true,
    alphaMap: createCanvasTexture(w, ctx => {
      // Create the overall distance gradient.
      const gradient = ctx.createLinearGradient(0, 0, 0, w);
      gradient.addColorStop(0, "#fff");
      gradient.addColorStop(1, "#222");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, w);
    }),
  });

  const sun = new Mesh(geometry, material);
  sun.position.x = 0;
  sun.position.y = 0.55;
  sun.position.z = 0;
  scene.add(sun);
  return sun;
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
