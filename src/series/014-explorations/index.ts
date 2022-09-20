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
import geoArc from "geo-arc";
import {
  quadMeshToBufferGeometry,
  triangleMeshToBufferGeometry,
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

    current.copyShader.uniforms.time.value = now;

    updateCamera(config, current);
    updateMeshes(config, current);

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

  function randomRotation() {
    const v = 0.0005;
    return [random(-v, v), random(-v, v), random(-v, v)];
  }

  const rocks = [
    { position: [-1.5, 1.0, -1.6], scale: 1.3, rotation: randomRotation() },
    { position: [-1.0, 0.7, -4.0], scale: 0.8, rotation: randomRotation() },
    { position: [1.0, 1.0, -1.1], scale: 2, rotation: randomRotation() },
    { position: [0.1, 1.0, -2.6], scale: 1, rotation: randomRotation() },
    { position: [0.7, 1.0, -1.1], scale: 1, rotation: randomRotation() },
    { position: [-1.9, 2.4, -3.1], scale: 2, rotation: randomRotation() },
  ];

  for (const rock of rocks) {
    const scale = 3;
    rock.position[0] *= scale;
    rock.position[1] *= scale + 1;
    rock.position[2] -= 6;
    rock.scale *= scale;
  }

  return {
    seed,
    random,
    simplex2,
    simplex3,
    groundPosition: -0.5,
    rockSize: 0.12,
    sphereNoiseScale: 0.1,
    sphereNoiseSpeed: 0.05,
    rocks,
    rockNoiseOffset: 10,
    rockRandomSeed: 10,
    rockPerturbations: [
      { scale: 3.0, twist: 1, noisePeriod: [1.0, 1.0, 1.0] },
      { scale: 0.21, twist: 1, noisePeriod: [3.0, 3.0, 3.0] },
      { scale: 0.2, twist: 1, noisePeriod: [10.0, 1.0, 10.0] },
      { scale: 0.05, twist: 1, noisePeriod: [3.0, 10.0, 3.0] },
      { scale: 0.2, twist: 1, noisePeriod: [3.0, 10.0, 3.0] },
    ],
    arcs: [
      { count: 3, sweep: 0.1, offset: 0, radius: [0.45, 0.005] },
      { count: 2, sweep: 0.4, offset: 0.1, radius: [0.55, 0.05] },
      { count: 11, sweep: 0.5, offset: 0.1, radius: [0.48, 0.005] },
      { count: 4, sweep: 0.4, offset: 0.3, radius: [0.65, 0.05] },
      { count: 15, sweep: 0.4, offset: 0.3, radius: [0.8, 0.1] },
    ],
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
  const copyShader = new ShaderPass(getCopyShader());
  composer.addPass(copyShader);
  composer.setPixelRatio(window.devicePixelRatio);
  scene.background = new THREE.Color("#91b596");

  camera.rotation.x = 0.4;

  addLights(scene);

  // Mutable state.
  const current = {
    time: Date.now() / 1000,
    dt: 0,
    scene,
    camera,
    renderer,
    root,
    composer,
    copyShader,
    background: addBackground(config, scene),
    rockMeshes: addRock(config, scene),
    terrain: addTerrain(config, scene),
    sun: addSun(scene),
    arc: addArc(config, scene),
  };

  return current;
}

function updateCamera(config: Config, current: Current): void {
  const { camera } = current;
  const cameraShakeIntensity = 0.03;
  const cameraShakePeriod = 0.0001;
  camera.position.x =
    config.simplex2(Date.now() * cameraShakePeriod, 0) * cameraShakeIntensity;
  camera.position.y =
    config.simplex2(Date.now() * cameraShakePeriod, 100) * cameraShakeIntensity;
}

function updateMeshes(config: Config, current: Current): void {
  const { simplex2, rocks, sphereNoiseScale, sphereNoiseSpeed } = config;
  const { time, rockMeshes, sun, arc } = current;

  for (let i = 0; i < rocks.length; i++) {
    const rock = rocks[i];
    const mesh = rockMeshes[i];
    const [x, y, z] = rock.position;
    mesh.position.x =
      x + simplex2(time * sphereNoiseSpeed, i * 10) * sphereNoiseScale;
    mesh.position.z =
      z + simplex2(time * sphereNoiseSpeed, -i * 10) * sphereNoiseScale;

    mesh.rotation.x += rock.rotation[0];
    mesh.rotation.y += rock.rotation[1];
    mesh.rotation.z += rock.rotation[2];
  }

  arc.rotation.y += 0.001;

  const t = simplex2(time * 5, 0) * 0.5 + 1;
  (sun.material as THREE.Material).opacity = lerp(0.9, 1.0, t);
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

  // renderer.shadowMap.enabled = true;
  // renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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

function addBackground(config: Config, scene: Scene): Mesh {
  const canvasWidth = 2048;
  const width = 30;
  const geometry = new PlaneGeometry(width, width);
  const material = new MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    map: createCanvasTexture(canvasWidth, (ctx) => {
      {
        // Create the overall distance gradient.
        const gradient = ctx.createLinearGradient(0, 0, 0, canvasWidth);
        gradient.addColorStop(0.1, "#172a26");
        gradient.addColorStop(0.4, "#99be9e");
        gradient.addColorStop(0.6, "#a4bd88");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasWidth);
      }
      {
        // Make a textured surface.
        const baseBrushWidth = 100;
        ctx.fillStyle = "#00000002";
        for (let i = 0; i < 4000; i++) {
          const brushWidth = baseBrushWidth * Math.random();
          const x = Math.random() * canvasWidth - brushWidth / 2;
          const y = Math.random() * canvasWidth - brushWidth / 2;
          ctx.fillRect(x, y, brushWidth, brushWidth);
        }
      }
      {
        // Draw clouds
        const clouds = [
          {
            // Center right
            brushWidth: 20,
            offset: { x: 0, y: 0 },
            initial: { x: 0.5, y: 0.4 },
            scale: { x: 20, y: 10 },
            color: "#ffcc9902",
            random: setupRandom(5),
            count: 2000,
          },
          {
            // Center left
            brushWidth: 30,
            offset: { x: -200, y: 50 },
            initial: { x: 0.5, y: 0.4 },
            scale: { x: 30, y: 20 },
            color: "#ffcc9902",
            random: setupRandom(8),
            count: 2000,
          },
          {
            // Center left
            brushWidth: 30,
            offset: { x: -500, y: -10 },
            initial: { x: 0.5, y: 0.4 },
            scale: { x: 30, y: 20 },
            color: "#ffcc9902",
            random: setupRandom(8),
            count: 5000,
          },
          {
            // Center left
            brushWidth: 20,
            offset: { x: 0, y: -600 },
            initial: { x: 0.5, y: 0.5 },
            scale: { x: 50, y: 20 },
            color: "#ffccaa03",
            random: setupRandom(12),
            count: 10000,
          },
        ];
        for (const cloud of clouds) {
          const { brushWidth, random, initial, scale, color, count, offset } =
            cloud;
          let x = canvasWidth * initial.x + offset.x;
          let y = canvasWidth * initial.y + offset.y;
          ctx.fillStyle = color;
          for (let i = 0; i < count; i++) {
            x += scale.x * (random() - 0.5);
            y += scale.y * (random() - 0.5);
            ctx.fillRect(x, y, brushWidth, brushWidth);
          }
        }
      }
      {
        // Make stars
        const baseStarWidth = 2;

        ctx.fillStyle = "#ffc";
        for (let i = 0; i < 1000; i++) {
          const starWidth = baseStarWidth * Math.random();
          const x = Math.random() * canvasWidth - starWidth / 2;
          const yR = Math.random();
          const y = yR * yR * yR * canvasWidth * 0.5 - starWidth / 2;
          ctx.beginPath();
          ctx.arc(x, y, starWidth, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }),
  });

  const mesh = new Mesh(geometry, material);
  mesh.receiveShadow = false;
  scene.add(mesh);
  mesh.position.y = 1;
  mesh.position.z = -9;
  mesh.rotation.x = 0.2;
  material.depthWrite = false;

  return mesh;
}

function addLights(scene: Scene): void {
  {
    const light = new DirectionalLight(0xffffff, 1.5);
    light.position.set(0, 10, -3);
    light.castShadow = false;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 20;
    // light.shadow.bias = -0.000222;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;

    // const helper = new THREE.CameraHelper(light.shadow.camera);
    // scene.add(helper);

    scene.add(light);
  }

  {
    const light = new DirectionalLight(0xffffff, 1.5);
    light.position.set(0, -1, 0);
    light.castShadow = false;
    light.intensity = 0.1;

    // const helper = new THREE.CameraHelper(light.shadow.camera);
    // scene.add(helper);

    scene.add(light);
  }

  const ambient = new THREE.AmbientLight(0xa6c09a);
  ambient.intensity = 0.7;
  scene.add(ambient);
}

function addRock(config: Config, scene: Scene): Mesh[] {
  const {
    rockSize,
    groundPosition,
    rocks,
    rockPerturbations,
    rockNoiseOffset,
    rockRandomSeed,
  } = config;

  const material = new MeshPhysicalMaterial({
    color: 0xffffff,
    // emissive: "#333",
    metalness: 0.1,
    roughness: 0.8,
    reflectivity: 0.0,
    clearcoat: 0.0,
  });

  const random = setupRandom(rockRandomSeed);
  const simplex = new Simplex(random);
  const simplex2 = simplex.noise2D.bind(simplex);
  const simplex3 = simplex.noise3D.bind(simplex);

  // const textureLoader = new TextureLoader();
  // const material = new MeshMatcapMaterial({
  //   // matcap: textureLoader.load("../html/matcap/blender.png"),
  //   matcap: textureLoader.load("../html/matcap/thuglee-chrome-02b.jpg"),
  // });

  const meshes = [];

  let i = 0;
  for (const { position, scale } of rocks) {
    i++;
    const mesh = quads.createBox(0.5, 0.5, 0.5);

    // Offset sufficiently into the simplex noise so each rock is unique.
    const noiseOffset = i * 100 + rockNoiseOffset;

    // Perform the first perturbation.
    for (const { scale, noisePeriod, twist } of rockPerturbations) {
      for (const p of mesh.positions) {
        vec3.scale(
          p,
          p,
          1.0 +
            simplex3(
              p[0] * noisePeriod[0],
              p[1] * noisePeriod[1],
              p[2] * noisePeriod[2] + i * noiseOffset
            ) *
              scale
        );
        vec3.rotateY(p, p, ORIGIN, twist);
      }
      quads.subdivide(mesh, 1);
    }

    const rockMesh = new Mesh(quadMeshToBufferGeometry(mesh), material);
    rockMesh.position.x = position[0];
    rockMesh.position.y = groundPosition + rockSize + position[1];
    rockMesh.position.z = position[2];
    rockMesh.scale.x = scale;
    rockMesh.scale.y = scale;
    rockMesh.scale.z = scale;
    rockMesh.castShadow = true;
    scene.add(rockMesh);
    meshes.push(rockMesh);
  }

  return meshes;
}

function addTerrain(config: Config, scene: Scene): Mesh {
  const { groundPosition } = config;
  const canvasWidth = 1024;

  const width = 10;
  const depth = 10;
  const positionZ = -5;
  const segments = 200;
  const geometry = new PlaneGeometry(width, depth, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const vertices = geometry.attributes.position.array as number[];

  const terrainOverallRaise = 0.1;
  const terrainHeight1 = 0.3;
  const terrainHeight2 = 0.05;
  const terrainHeight3 = 1.0;
  const terrainScale1 = 0.4;
  const terrainScale2 = 2.0;
  const terrainScale3 = 0.1;

  const random = setupRandom(9049584095845);
  const simplex = new Simplex(random);
  const simplex2 = simplex.noise2D.bind(simplex);
  const simplex3 = simplex.noise3D.bind(simplex);

  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i + 0];
    const z = vertices[i + 2];
    // Make it so the terrain is lower closer to the camera.
    const depthScale = Math.min(1, (1 - (z + depth / 2) / depth) * 4);

    vertices[i + 1] =
      Math.max(
        0,
        terrainOverallRaise +
          simplex2(x * terrainScale1, z * terrainScale1) * terrainHeight1 +
          simplex2(x * terrainScale2, z * terrainScale2) * terrainHeight2 +
          simplex2(x * terrainScale3, z * terrainScale3) * terrainHeight3
      ) * depthScale;
  }

  const material = new MeshPhysicalMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    map: createCanvasTexture(canvasWidth, (ctx) => {
      {
        // Create the overall distance gradient.
        const gradient = ctx.createLinearGradient(0, 0, 0, canvasWidth);
        gradient.addColorStop(0.7, "#55332F"); // background
        gradient.addColorStop(1, "#C04D2F"); // foreground
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1024, 1024);
      }
      {
        // Make a textured surface.
        const baseBrushWidth = 100;
        ctx.fillStyle = "#00000003";
        for (let i = 0; i < 4000; i++) {
          const brushWidth = baseBrushWidth * Math.random();
          const x = Math.random() * canvasWidth - brushWidth / 2;
          const y = Math.random() * canvasWidth - brushWidth / 2;
          ctx.fillRect(x, y, brushWidth, brushWidth);
        }
      }
    }),
    // emissive: 0x2f4432,
  });

  const terrain = new Mesh(geometry, material);
  terrain.receiveShadow = true;
  terrain.castShadow = true;
  scene.add(terrain);
  // terrain.rotation.x = Math.PI * -0.5;
  terrain.position.y = groundPosition;
  terrain.position.z = positionZ;
  terrain.rotation.y = Math.PI * 0.2;

  return terrain;
}

function addSun(scene: Scene): Mesh {
  const geometry = new CircleGeometry(4, 64);
  const w = 128;
  const material = new MeshBasicMaterial({
    // color,
    side: THREE.DoubleSide,
    transparent: true,
    map: createCanvasTexture(w, (ctx) => {
      const x = w * 0.4;
      const y = w * 0.35;
      // Create the overall distance gradient.
      const gradient = ctx.createRadialGradient(
        // Circle one:
        x,
        y,
        0,
        // Circle two:
        x,
        y,
        w * 0.75
      );
      const white = "#fafbc8";
      const blue = "#d1ffdd";
      gradient.addColorStop(0.4, white);
      gradient.addColorStop(0.6, blue);
      gradient.addColorStop(0.75, blue);
      gradient.addColorStop(0.9, white);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, w);
    }),
    // alphaMap: createCanvasTexture(w, (ctx) => {
    //   // Create the overall distance gradient.
    //   const gradient = ctx.createLinearGradient(0, 0, 0, w);
    //   gradient.addColorStop(0, "#fff");
    //   gradient.addColorStop(1, "#222");
    //   ctx.fillStyle = gradient;
    //   ctx.fillRect(0, 0, w, w);
    // }),
  });

  const sun = new Mesh(geometry, material);
  sun.position.x = 0;
  sun.position.y = 14;
  sun.position.z = -10;
  sun.scale.y = 1.35; // Adjust for the wide angle skew.
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

function getCopyShader() {
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

        float aberration = 0.0025 * (d);
        color.r = texture2D(tDiffuse, uv + vec2(aberration, 0.0)).r;
        color.b = texture2D(tDiffuse, uv - vec2(aberration, 0.0)).b;

        float vignette = 1.0 - length(uv - vec2(0.5, 0.6));
        vignette = min(1.0, vignette * 2.0);

        float glow = max(0.0, 1.0 - length(uv * 2.0 - vec2(1.0, 2.0))) * ((1.0 + sin(time * 10.0)) + (1.0 + sin(time * 7.0))) * 0.02;

        // Noise
        color += simplex(vec3(uv * 1000.0, time)) * 0.05;

        gl_FragColor = vec4(color * vignette + glow, 1.0);
      }
    `,
  };
}

function addArc(config: Config, scene: Scene) {
  const mesh = getEmptyTriangleMesh();
  const { arcs } = config;

  for (const { count, sweep, offset, radius } of arcs) {
    for (let i = 0; i < count; i++) {
      const ratio = i / count;
      const tau = Math.PI * 2;
      const startRadian = offset * tau + tau * ratio;
      addGeometryToTriangleMesh(
        mesh,
        geoArc({
          cellSize: 3,
          startRadian: startRadian,
          endRadian: startRadian + (tau / count) * sweep,
          numSlices: 80,
          numBands: 2,
          innerRadius: radius[0],
          outerRadius: radius[0] + radius[1],
        })
      );
    }
  }

  const material = new MeshBasicMaterial({
    color: "#e9ffef",
    side: THREE.DoubleSide,
  });

  material.depthWrite = false;

  const arcMesh = new Mesh(triangleMeshToBufferGeometry(mesh), material);
  arcMesh.position.x = 0;
  arcMesh.position.y = 2;
  arcMesh.position.z = -7;
  arcMesh.scale.multiplyScalar(15);
  arcMesh.rotation.z = 0.25;

  arcMesh.rotation.order = "ZYX";

  scene.add(arcMesh);

  return arcMesh;
}
