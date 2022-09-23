import {
  CanvasTexture,
  MeshPhysicalMaterial,
  BufferGeometry,
  BufferAttribute,
  Shader,
} from "three";
import * as THREE from "three";
import { GUI } from "dat.gui";
import * as quads from "lib/quads";

export function createCanvasTexture(
  canvasWidth: number,
  callback: (ctx: CanvasRenderingContext2D) => void
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

export function scaleHexColor(color: number, scalar: number): number {
  let r = color >> 16;
  let g = (color >> 8) & 0xff;
  let b = color & 0xff;
  r *= scalar;
  g *= scalar;
  b *= scalar;
  return (r << 16) | (g << 8) | b;
}

let materialCount = 1;
export function guiMeshPhysicalMaterial(
  gui: GUI,
  material: MeshPhysicalMaterial
): void {
  let name = material.name;
  if (!name) {
    name = "MeshPhysicalMaterial " + materialCount++;
  }
  const folder = gui.addFolder(name);
  const data = {
    color: material.color.getHex(),
    emissive: material.emissive.getHex(),
  };

  function handleColorChange(color: any): any {
    return (value: any): void => {
      if (typeof value === "string") {
        value = value.replace("#", "0x");
      }
      color.setHex(value);
    };
  }

  folder.addColor(data, "color").onChange(handleColorChange(material.color));
  folder
    .addColor(data, "emissive")
    .onChange(handleColorChange(material.emissive));

  folder.add(material, "roughness", 0, 1).step(0.01);
  folder.add(material, "metalness", 0, 1).step(0.01);
  folder.add(material, "reflectivity", 0, 1).step(0.01);
  folder.add(material, "clearcoat", 0, 1).step(0.01);
  folder.add(material, "clearcoatRoughness", 0, 1).step(0.01);
  folder.add(material, "wireframe");
  folder.add(material, "wireframeLinewidth", 0, 10);
  folder.add(material, "fog");
}

let meshCount = 1;
export function guiAddMesh(gui: GUI, mesh: THREE.Mesh, range = 10): void {
  let name = mesh.name;
  if (!name) {
    name = "Mesh " + meshCount++;
  }
  const data = { scale: (mesh.scale.x + mesh.scale.y + mesh.scale.z) / 3 };
  const folder = gui.addFolder(name);
  const position = folder.addFolder("position");
  position.open();
  position.add(mesh.position, "x", -range, range).step(0.1);
  position.add(mesh.position, "y", -range, range).step(0.1);
  position.add(mesh.position, "z", -range, range).step(0.1);

  const rotation = folder.addFolder("rotation");
  rotation.open();
  rotation.add(mesh.rotation, "x", 0, Math.PI * 2).step(0.01);
  rotation.add(mesh.rotation, "y", 0, Math.PI * 2).step(0.01);
  rotation.add(mesh.rotation, "z", 0, Math.PI * 2).step(0.01);

  const scale = folder.addFolder("scale");
  scale.open();
  scale
    .add(data, "scale", 0, 10)
    .step(0.01)
    .onChange(() => {
      mesh.scale.x = data.scale;
      mesh.scale.y = data.scale;
      mesh.scale.z = data.scale;
    });
  scale.add(mesh.scale, "x", 0, 10).step(0.01);
  scale.add(mesh.scale, "y", 0, 10).step(0.01);
  scale.add(mesh.scale, "z", 0, 10).step(0.01);
}

let lightCount = 1;
export function guiAddLight(
  gui: GUI,
  light: THREE.DirectionalLight,
  range = 10
): void {
  let name = light.name;
  if (!name) {
    name = "Light " + lightCount++;
  }
  const folder = gui.addFolder(name);
  folder.add(light.position, "x", -range, range).step(0.1);
  folder.add(light.position, "y", -range, range).step(0.1);
  folder.add(light.position, "z", -range, range).step(0.1);
  folder.add(light, "intensity", 0, 1);
  const proxyData = {
    color: "#" + light.color.getHexString(),
  };
  folder.addColor(proxyData, "color").onChange(() => {
    light.color.set(proxyData.color);
  });
}

export function quadMeshToBufferGeometry(mesh: QuadMesh | QuadMeshNormals) {
  const geometry = new BufferGeometry();
  const positions = new Float32Array(mesh.positions.length * 3);
  const indices = quads.getElements(mesh);

  for (let i = 0; i < mesh.positions.length; i++) {
    const position = mesh.positions[i];
    positions[i * 3] = position[0];
    positions[i * 3 + 1] = position[1];
    positions[i * 3 + 2] = position[2];
  }

  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.setAttribute("position", new BufferAttribute(positions, 3));

  if (mesh.normals) {
    const normals = new Float32Array(mesh.normals.length * 3);
    for (let i = 0; i < mesh.normals.length; i++) {
      const normal = mesh.normals[i];
      normals[i * 3] = normal[0];
      normals[i * 3 + 1] = normal[1];
      normals[i * 3 + 2] = normal[2];
    }
    geometry.setAttribute("normal", new BufferAttribute(normals, 3));
  }

  return geometry;
}

export function triangleMeshToBufferGeometry(
  mesh: TriangleMesh | TriangleMeshNormals
) {
  const geometry = new BufferGeometry();

  const elements = new Uint16Array(mesh.cells.length * 3);
  for (let i = 0; i < mesh.cells.length; i++) {
    const offset = i * 3;
    const [a, b, c] = mesh.cells[i];
    elements[offset + 0] = a;
    elements[offset + 1] = b;
    elements[offset + 2] = c;
  }
  geometry.setIndex(new BufferAttribute(elements, 1));

  const positions = new Float32Array(mesh.positions.length * 3);
  for (let i = 0; i < mesh.positions.length; i++) {
    const position = mesh.positions[i];
    positions[i * 3] = position[0];
    positions[i * 3 + 1] = position[1];
    positions[i * 3 + 2] = position[2];
  }
  geometry.setAttribute("position", new BufferAttribute(positions, 3));

  if ("normals" in mesh && mesh.normals) {
    const normals = new Float32Array(mesh.normals.length * 3);
    for (let i = 0; i < mesh.normals.length; i++) {
      const normal = mesh.normals[i];
      normals[i * 3] = normal[0];
      normals[i * 3 + 1] = normal[1];
      normals[i * 3 + 2] = normal[2];
    }
    geometry.setAttribute("normal", new BufferAttribute(normals, 3));
  }

  return geometry;
}

function insertTextAfter(
  mainText: string,
  matchText: string,
  injectText: string,
  shaderType: string
): string {
  const index = mainText.indexOf(matchText);
  if (index === -1) {
    throw new Error(
      `Could not find "${matchText}" for injecting shader code into the ${shaderType}`
    );
  }
  let endIndex;
  for (endIndex = index + 1; endIndex < mainText.length; endIndex++) {
    if (mainText[endIndex] === "\n") {
      break;
    }
  }
  return (
    mainText.substring(0, endIndex + 1) +
    injectText +
    "\n" +
    mainText.substring(endIndex + 1)
  );
}

interface ShaderInjectionPoints {
  uniforms: Record<string, any>;
  gl_FragColor: string;
  // The normal in object space, in the vertex shader.
  objectNormal: string;
  // A vec3 which represents the point. It will be transformed, but this is a hook
  // to be able to modify it first.
  transformed: string;
  vertHeader: string;
  fragHeader: string;
}

export class ShaderInjector {
  config: any = null;
  current: any = null;

  update(config: any, current: any) {
    this.config = config;
    this.current = current;
  }

  /**
   * In three.js see:
   * src/renderers/shaders/ShaderLib/meshphysical_vert.glsl.js
   * src/renderers/shaders/ShaderLib/meshphysical_frag.glsl.js
   */
  inject(mesh: THREE.Mesh, injections: Partial<ShaderInjectionPoints>): void {
    const updateUniforms: Array<[string, (...args: any) => void]> = [];
    let shader: Shader;
    const { material } = mesh;
    if (Array.isArray(material)) {
      throw new Error("Expected a non-array material.");
    }
    material.onBeforeCompile = (shaderIn, _renderer) => {
      shader = shaderIn;
      if (injections.uniforms) {
        for (const [name, value] of Object.entries(injections.uniforms)) {
          if (typeof value === "function") {
            updateUniforms.push([name, value]);
            shader.uniforms[name] = { value: undefined };
          } else {
            shader.uniforms[name] = { value };
          }
        }
      }

      if (injections.gl_FragColor) {
        shader.fragmentShader = insertTextAfter(
          shader.fragmentShader,
          "\n\tgl_FragColor = ",
          injections.gl_FragColor,
          "fragment shader"
        );
      }

      if (injections.transformed) {
        shader.vertexShader = insertTextAfter(
          shader.vertexShader,
          "\n\t#include <begin_vertex>",
          injections.transformed,
          "vertex shader"
        );
      }

      if (injections.vertHeader) {
        shader.vertexShader = insertTextAfter(
          shader.vertexShader,
          "\n#include <common>",
          injections.vertHeader,
          "vertex shader"
        );
      }

      if (injections.fragHeader) {
        shader.fragmentShader = insertTextAfter(
          shader.fragmentShader,
          "\n#include <common>",
          injections.fragHeader,
          "vertex shader"
        );
      }

      if (injections.objectNormal) {
        shader.vertexShader = insertTextAfter(
          shader.vertexShader,
          "\n\t#include <morphnormal_vertex>",
          injections.objectNormal,
          "objectNormal in the vertex shader"
        );
      }
    };

    mesh.onBeforeRender = () => {
      if (!shader || updateUniforms.length === 0) {
        return;
      }
      if (!this.config || !this.current) {
        throw new Error(
          "The update function was not called for the ShaderInjector."
        );
      }
      for (const [key, fn] of updateUniforms) {
        shader.uniforms[key].value = fn(this.config, this.current);
      }
    };

    material.customProgramCacheKey = () => {
      if (shader) {
        return shader.vertexShader + shader.fragmentShader;
      }
      return "invalid cache";
    };
  }
}
