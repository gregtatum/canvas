import { GUI } from "dat.gui";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
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
} from "three";
import * as THREE from "three";
import lerp from "lerp";

import setupRandom from "@tatumcreative/random";
import initializeShortcuts from "lib/shortcuts";
import Simplex from "simplex-noise";
import {
  createCanvasTexture,
  scaleHexColor,
  guiMeshPhysicalMaterial,
  guiAddMesh,
} from "lib/three";
// import { generateSeed } from "lib/draw";

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

    current.copyShader.uniforms.time.value = now;

    updateMeshes(config, current);

    current.composer.render();
  });
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getConfig() {
  // const seed = generateSeed();
  const seed = "9256769908571096";
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
    triangleSpeed: 0.4,
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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

  camera.rotation.x = 0.0;

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
    terrain: addTerrain(config, scene),
    lake: addLake(config, scene),
    background: addBackground(config, scene),
    sun: addSun(scene),
    boxes: addBoxes(config, scene),
  };

  return current;
}

function updateMeshes(config: Config, current: Current): void {
  const { simplex2 } = config;
  const { time, sun, lake, background } = current;

  {
    const t = simplex2(time * 5, 0) * 0.5 + 1;
    (sun.material as THREE.Material).opacity = lerp(0.8, 1.0, t);
    (lake.material as MeshPhysicalMaterial).clearcoat = lerp(0.4, 0.5, t);
  }

  {
    current.camera.position.x = simplex2(time * 0.1, 0) * 0.05;
    current.camera.position.y = simplex2(time * 0.1, 100) * 0.05;
    current.camera.rotation.z = simplex2(time * 0.1, 0) * 0.05;
  }

  for (const box of current.boxes) {
    const t = simplex2(time * 0.05, box.position.z) * 0.5 + 0.5;
    box.rotation.z = lerp(0.05, 0.22, t);
  }
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

function addTerrain(config: Config, scene: Scene): Mesh {
  const { groundPosition, simplex2 } = config;
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
    map: createCanvasTexture(canvasWidth, ctx => {
      {
        // Create the overall distance gradient.
        const gradient = ctx.createLinearGradient(0, 0, 0, canvasWidth);
        gradient.addColorStop(0, "#e3d7bf");
        gradient.addColorStop(1, "#2f4432");
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
    // emissive: 0x2f4432,
  });

  const terrain = new Mesh(geometry, material);
  terrain.receiveShadow = true;
  terrain.castShadow = true;
  scene.add(terrain);
  // terrain.rotation.x = Math.PI * -0.5;
  terrain.position.y = groundPosition;
  terrain.position.z = positionZ;

  return terrain;
}

function addLake(config: Config, scene: Scene): Mesh {
  const { groundPosition } = config;
  const canvasWidth = Math.pow(2, 12);

  const width = 12;
  const length = 8;
  const geometry = new PlaneGeometry(width, length);
  geometry.rotateX(-Math.PI / 2);

  // const seed = generateSeed();
  const seed = "5907787502523045";
  const random = setupRandom(seed);
  const simplex = new Simplex(random);
  const simplex2 = simplex.noise2D.bind(simplex);

  const material = new MeshPhysicalMaterial({
    side: THREE.DoubleSide,
    color: 0x354823,
    emissive: 0x34433d,
    clearcoat: 0.4,
    clearcoatRoughness: 0.5,
    map: createCanvasTexture(canvasWidth, ctx => {
      {
        // Create the overall distance gradient.
        const gradient = ctx.createLinearGradient(0, 0, 0, canvasWidth);
        // gradient.addColorStop(0, "#b7a858");
        // gradient.addColorStop(1, "#424f3e");
        gradient.addColorStop(0, "#fff");
        gradient.addColorStop(1, "#222");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasWidth);
      }
      {
        // Draw the swirly patterns.
        ctx.lineWidth = canvasWidth * 0.0015;
        ctx.strokeStyle = "#fff";
        const rowCount = 200;
        const colCount = 200;
        const simplexScale = 3;
        const rotationRange = Math.PI * 0.5;
        const colStep = (2 * canvasWidth) / colCount;
        for (let row = 0; row < rowCount; row++) {
          const unitRow = row / rowCount;
          let x = canvasWidth;
          let y = unitRow * canvasWidth;
          for (let col = 0; col < colCount; col++) {
            const unitCol = col / colCount;
            const theta =
              simplex2(unitRow * simplexScale, unitCol * simplexScale) *
                rotationRange +
              Math.PI;
            x += Math.cos(theta) * colStep;
            y += Math.sin(theta) * colStep;
            if (col === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
        ctx.stroke();
        {
          // Make a textured surface.
          const baseBrushWidth = 200;
          ctx.fillStyle = "#00000005";
          for (let i = 0; i < 4000; i++) {
            const brushWidth = baseBrushWidth * Math.random();
            const x = Math.random() * canvasWidth - brushWidth / 2;
            const y = Math.random() * canvasWidth - brushWidth / 2;
            ctx.fillRect(x, y, brushWidth, brushWidth);
          }
        }
      }
    }),
    // emissive: 0x2f4432,
  });

  const mesh = new Mesh(geometry, material);
  mesh.receiveShadow = true;
  scene.add(mesh);
  // mesh.rotation.x = Math.PI * -0.5;
  mesh.position.y = groundPosition + 0.01;
  mesh.position.z = -width / 4;

  return mesh;
}

function addBackground(config: Config, scene: Scene): Mesh {
  // Orange: #c28133
  // Green back: #485435
  // Lighter: #7b7d5a
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
        gradient.addColorStop(0.1, "#6c512c");
        gradient.addColorStop(0.4, "#2d371f");
        gradient.addColorStop(0.5, "#677f69");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasWidth);
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
      {
        // Draw a round splatter
        const baseBrushWidth = 120;
        ctx.fillStyle = "#ae6e2b05";
        const maxRadius = canvasWidth * 0.4;
        for (let i = 0; i < 3000; i++) {
          const brushWidth = baseBrushWidth * Math.random();
          const theta = Math.random() * Math.PI * 2;
          const radius = Math.random() * maxRadius;
          const x = Math.cos(theta) * radius + canvasWidth * 0.3;
          const y = Math.sin(theta) * radius + canvasWidth * 0.35;
          ctx.fillRect(x, y, brushWidth, brushWidth);
        }
      }
      {
        // Draw a round splatter
        const baseBrushWidth = 100;
        ctx.fillStyle = "#ff9b0005";
        const maxRadius = canvasWidth * 0.05;
        for (let i = 0; i < 100; i++) {
          const brushWidth = baseBrushWidth * Math.random();
          const theta = Math.random() * Math.PI * 2;
          const radius = Math.random() * maxRadius;
          const x = Math.cos(theta) * radius + canvasWidth * 0.3;
          const y = Math.sin(theta) * radius + canvasWidth * 0.34;
          ctx.fillRect(x, y, brushWidth, brushWidth);
        }
      }
    }),
  });

  const terrain = new Mesh(geometry, material);
  terrain.receiveShadow = true;
  scene.add(terrain);
  // terrain.rotation.x = Math.PI * -0.5;
  terrain.position.y = 0;
  terrain.position.z = -9;

  return terrain;
}

function addLights(scene: Scene): void {
  const light = new DirectionalLight(0xffffff, 1.5);
  light.position.set(-2, 2, -3);
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

function addSun(scene: Scene): Mesh {
  const geometry = new CircleGeometry(2.5, 32);
  const w = 128;
  const material = new MeshBasicMaterial({
    color: 0xf1d453,
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
  sun.position.x = -4.8;
  sun.position.y = 3.6;
  sun.position.z = -8.9;

  scene.add(sun);
  return sun;
}

function addBoxes(config: Config, scene: Scene): Mesh[] {
  const { groundPosition } = config;
  const boxSize = [1.2, 0.1, 0.1];
  const boxPositions = [
    { x: 0.3, z: -0.01, r: 0.025 },
    { x: 1.5, z: -0.5, r: 0.025 },
    { x: 0.0, z: -1.0, r: 0.025 },
    { x: 1.3, z: -1.3, r: 0.025 },
    { x: 0.5, z: -1.8, r: 0.025 },
    { x: 2.75, z: -2.0, r: 0.025 },
    { x: 1.8, z: -2.3, r: 0.025 },
    { x: -0.3, z: -2.6, r: 0.025 },
    { x: 1.5, z: -2.8, r: 0.025 },
    { x: 4, z: -3.01, r: 0.025 },
  ];

  const geometry = new THREE.BoxGeometry(...boxSize);
  const material = new MeshPhysicalMaterial({
    color: scaleHexColor(0x3a4134, 1.0),
    emissive: scaleHexColor(0x31372c, 1.0),
  });

  const boxes = [];

  for (const { x, z, r } of boxPositions) {
    const box = new Mesh(geometry, material);
    box.position.x = x;
    box.position.y = groundPosition;
    box.position.z = z;
    box.rotateZ(Math.PI * r);
    box.castShadow = true;
    scene.add(box);
    boxes.push(box);
  }

  return boxes;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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
    fragmentShader: `
      uniform float time;
      uniform sampler2D tDiffuse;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        vec3 color = texture2D( tDiffuse, uv ).rgb;
        float d = distance(vec2(0.5, 0.5), uv) * 2.0;

        float aberration = 0.005 * (d);
        color.r = texture2D(tDiffuse, uv + vec2(aberration, 0.0)).r;
        color.b = texture2D(tDiffuse, uv - vec2(aberration, 0.0)).b;

        // Apply overall shading
        float t = mix(0.75, 1.0, uv.y);
        color = mix(vec3(1.0, 0.0, 0.0), color, t);

        // Apply a vignette effect.
        float t2 = sin(time * 7.0) * 0.5 + 0.5;
        t2 = mix(0.95, 1.0, t2);
        color *= mix(1.0, 1.2 - d * 0.8, t2);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  };
}
