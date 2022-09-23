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
} from "three";
import { simplex } from "lib/shaders";
import * as THREE from "three";
import * as Quads from "lib/quads";
import { vec3 } from "gl-matrix";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import geoPieceRing from "geo-piecering";

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

const ORIGIN = vec3.create();

type Config = ReturnType<typeof getConfig>;
type Current = ReturnType<typeof getCurrent>;

{
  const config = getConfig();
  const current = getCurrent(config);

  current.renderer.compile(current.scene, current.camera);

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
    background: "#68736B",
    landscapeSize: { w: 20, h: 20 },
    landscapeSubdivides: [3, 2],
    landscapeBumps: [
      {
        seed: "34598340583495",
        subdivide: 2,
        countRatio: 0.5,
        inset: 0.2,
        extrude: 0.6,
      },
      {
        seed: "44598340583495",
        subdivide: 1,
        countRatio: 0.5,
        inset: 0.2,
        extrude: 0.2,
      },
      {
        seed: "44598340583495",
        subdivide: 1,
        countRatio: 0.9,
        inset: 0.9,
        extrude: 0.4,
      },
    ],
    landscapeFinalSmooth: 1,
  };
}

function getCurrent(config: Config) {
  const root = document.createElement("div");
  root.classList.add("fullscreen");
  document.body.appendChild(root);

  const { camera, scene, renderer } = setupBasicScene(root);

  scene.fog = new Fog(config.background, -0, 30);
  scene.background = new Color("#68736B");

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const screenShader = new ShaderPass(getScreenShader());
  composer.addPass(screenShader);
  composer.setPixelRatio(window.devicePixelRatio);

  camera.rotation.x = 0.2;

  const gui = new GUI();
  const shaderInjector = new ShaderInjector();

  const pointLight = addLights(scene, gui);
  gui.hide();

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
    sphere: addSphere(config, shaderInjector, scene, gui),
    landscape: addLandscape(config, scene, gui, shaderInjector),
    pointLight,
    pointLightIntensity: pointLight.intensity,
    pieceRing: addPieceRing(config, scene, gui),
  };
}

function update(config: Config, current: Current): void {
  current.shaderInjector.update(config, current);

  const prevTime = current.time;
  current.time = Date.now() / 1000 - current.start;
  current.dt = current.time - prevTime;
  current.sphere.rotation.y += 0.0025;

  const t =
    0 * 0 +
    (0.5 * Math.sin(current.time * 7) + 0.5) +
    (0.5 * Math.sin(current.time * 20) + 0.5) +
    (0.5 * Math.sin(current.time * 47) + 0.5);

  current.pointLight.intensity = current.pointLightIntensity + 0.2 * t;

  {
    const { simplex2 } = config;
    const { camera, time } = current;
    camera.position.x = simplex2(time * 0.1, 0) * 0.05;
    camera.position.y = simplex2(time * 0.1, 100) * 0.05;
    camera.rotation.z = simplex2(time * 0.05, 200) * 0.05;
  }

  current.pieceRing.rotation.z += 0.001;
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

function addLights(scene: Scene, gui: GUI): PointLight {
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
    const light = new DirectionalLight("#b2ffe4", 0.18);
    light.name = "FIll Light";
    light.position.set(-2, -5.7, 2.2);
    light.castShadow = false;
    guiAddLight(gui, light);
    scene.add(light);
  }

  {
    const light = new PointLight(0xff7800, 1.7, 4.94);
    light.name = "Point Light";
    light.position.set(1.1, -0.4, -5.3);
    scene.add(light);
    guiAddLight(gui, light);
    return light;
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
        float wave = sin(uv.y * 50.0 + time * 2.0);
        wave *= wave;
        wave *= wave;
        wave *= wave;

        float wave2 = sin(uv.y * 37.0 + time * 3.1);
        wave2 *= wave2;
        wave2 *= wave2;
        wave2 *= wave2;

        float wave3 = sin(uv.y * 11.0 + time * 1.1);
        wave3 *= wave3;
        wave3 *= wave3;

        wave += wave2;
        wave += wave3;

        wave *= 0.3;

        uv.x += max(0.0, wave) * 0.0025;
        vec3 color = texture2D(tDiffuse, uv).rgb;


        float d = distance(vec2(0.5, 0.5), uv) * 1.5;

        float aberration = 0.005 * d * d;
        color.r = texture2D(tDiffuse, uv + vec2(aberration, 0.0)).r;
        color.b = texture2D(tDiffuse, uv - vec2(aberration, 0.0)).b;

        color *= wave * 0.1 + 1.0;

        // Vignette
        color *= (1.0 - d * d);



        // Noise
        color += simplex(vec3(vUv * 1000.0, time)) * 0.05;
        color *= 1.0 + simplex(vec2(vUv.y * 100.0, time)) * 0.03;

        // Brighten
        color = pow(color, vec3(1.1, 1.0, 1.05)) * 1.3;

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
    vert: {
      header: /* glsl */ `
        ${simplex}
        uniform float time;
        varying vec3 vPosition;
      `,
      objectNormal: /* glsl */ `
        // float _offset = sin(position.x * 5.0 + time) + sin(position.y * 20.0 + time);
        // float _wave = sin(time + 10.0 * position.y + 2.5 + _offset) * 0.5;
        // objectNormal.y += (0.5 + _wave) * 0.5;
        float _noise = simplex(vec4(position * 10.0, time * 0.5)) * 0.2;
        objectNormal.y += _noise;
        objectNormal = normalize(objectNormal);
      `,
      transformed: /* glsl */ `
        transformed *= 1.0 + _noise * 0.1;
        vPosition = transformed;
      `,
    },
    frag: {
      header: /* glsl */ `
        ${simplex}
        uniform float time;
        varying vec3 vPosition;
      `,
      gl_FragColor: /* glsl */ `
        float _noise1 = simplex(vec4(vPosition * 5.0 * vec3(1.0, 3.0, 1.0), time * 0.1));
        float _noise2 = simplex(vec4(_noise1 * 0.2 + vPosition * 5.0, time * 0.1));
        float _noise3 =
          simplex(vec4(_noise2 + vPosition * vec3(3.0, 20.0, 3.0) * 1.0, time * 0.1)) +
          simplex(vec4(_noise2 + vPosition * vec3(1.0, 30.0, 1.0) * 1.0, time * 0.1));
        gl_FragColor.xyz -= _noise2 * 0.05;
        gl_FragColor = max(gl_FragColor, gl_FragColor * _noise3 * _noise3);
      `,
    },
  });

  scene.add(sphere);
  sphere.position.x = 0.8;
  sphere.position.y = 2.3;
  sphere.position.z = -5;
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  sphere.scale.multiplyScalar(1.6);

  return sphere;
}

function addLandscape(
  config: Config,
  scene: Scene,
  gui: GUI,
  shaderInjector: ShaderInjector
) {
  const material = new MeshPhysicalMaterial({
    color: "#615a51",
    emissive: "#1b1817",
    roughness: 0.59,
    metalness: 0.13,
    reflectivity: 0.3,
    clearcoat: 0.75,
    clearcoatRoughness: 0.57,
  });
  const { mesh } = Quads.createQuad({ ...config.landscapeSize, facing: "y+" });

  // Do an initial subdivide.
  for (const {
    seed,
    countRatio,
    inset,
    extrude,
    subdivide,
  } of config.landscapeBumps) {
    Quads.subdivide(mesh, subdivide);
    const random = setupRandom(seed);

    const elongate = [];
    for (let quadIndex = 0; quadIndex < mesh.quads.length; quadIndex++) {
      if (random() > countRatio) {
        elongate.push(quadIndex);
      }
    }
    for (const quadIndex of elongate) {
      Quads.extrude(mesh, quadIndex, inset, extrude);
    }
  }
  Quads.subdivide(mesh, config.landscapeFinalSmooth);

  let minZ = Infinity;
  let maxZ = -Infinity;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const [x, y, z] of mesh.positions) {
    minX = Math.min(x, minX);
    maxX = Math.max(x, maxX);
    minZ = Math.min(z, minZ);
    maxZ = Math.max(z, maxZ);
  }
  for (const position of mesh.positions) {
    // Push it up at the back some.
    const ratioX = (position[0] - minX) / (maxX - minX);
    const ratioZ = (position[2] - minZ) / (maxZ - minZ);
    const parabola = (ratioX - 0.5) * (ratioX - 0.5) * 4;
    position[1] += (1 - ratioZ) * 3;
    position[1] += parabola * 2 - 1;
  }

  Quads.computeSmoothNormals(mesh);
  const geometry = quadMeshToBufferGeometry(mesh);

  material.name = "Landscape Material";
  // material.wireframe = true;
  const landscape = new Mesh(geometry, material);
  landscape.name = "Landscape Mesh";
  landscape.position.set(0, -0.8, -10);
  landscape.receiveShadow = true;
  landscape.castShadow = true;
  scene.add(landscape);

  shaderInjector.inject(landscape, {
    uniforms: {
      time: (config: Config, current: Current) => current.time,
    },
    vert: {
      header: /* glsl */ `
        ${simplex}
        uniform float time;
        varying vec3 vPosition;
      `,
      objectNormal: /* glsl */ `
      `,
      transformed: /* glsl */ `
        vPosition = transformed;
      `,
    },
    frag: {
      header: /* glsl */ `
        ${simplex}
        uniform float time;
        varying vec3 vPosition;
      `,
      gl_FragColor: /* glsl */ `
        vec3 _skew = vec3(1.0, 3.0, 1.0);
        float _noise1 = simplex(vec3(vPosition * 1.0 * _skew));
        float _noise2 = simplex(vec3(_noise1 * 2.0 + vPosition * _skew * 5.0));
        float _noise3 =
          dot(
            vNormal,
            vec3(0.0, 1.0, 0.0)
          ) *
          simplex(vec3(vPosition * 0.5 * vec3(1.0, simplex(vec3(vPosition)) * 50.0, 1.0)));
        gl_FragColor.xyz -= _noise2 * 0.05 + _noise3 * 0.1;
      `,
    },
  });

  guiAddMesh(gui, landscape);
  guiMeshPhysicalMaterial(gui, material);
  return landscape;
}

function addPieceRing(config: Config, scene: Scene, gui: GUI) {
  const mesh = getEmptyTriangleMesh();

  addGeometryToTriangleMesh(
    mesh,
    geoPieceRing({
      radius: 10,
      height: 20,
      numPieces: 22,
      quadsPerPiece: 5,
      pieceSize: Math.PI * 0.01,
    })
  );

  const origin = [0, 0, 0] as Tuple3;
  for (const position of mesh.positions) {
    vec3.rotateX(position, position, origin, Math.PI * 0.5);
    // Make sure the first shadow sweeps through pretty quicklly.
    vec3.rotateZ(position, position, origin, 0.2);
  }

  const material = new MeshBasicMaterial({
    color: "#e9ffef",
    side: THREE.DoubleSide,
  });

  material.depthWrite = false;

  const ring = new Mesh(triangleMeshToBufferGeometry(mesh), material);
  ring.name = "Ring Mesh";
  ring.castShadow = true;
  ring.receiveShadow = false;
  ring.position.x = 2;
  ring.position.y = 0;
  ring.position.z = 0;
  guiAddMesh(gui, ring);
  ring.scale.multiplyScalar(1);
  // ring.rotation.z = 0.25;

  ring.rotation.order = "ZYX";

  scene.add(ring);

  return ring;
}
