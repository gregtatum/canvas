import {
  CanvasTexture,
  MeshPhysicalMaterial,
  BufferGeometry,
  BufferAttribute,
} from "three";
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

export function guiMeshPhysicalMaterial(
  gui: GUI,
  material: MeshPhysicalMaterial
): void {
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

  gui.addColor(data, "color").onChange(handleColorChange(material.color));
  gui.addColor(data, "emissive").onChange(handleColorChange(material.emissive));

  gui.add(material, "roughness", 0, 1);
  gui.add(material, "metalness", 0, 1);
  gui.add(material, "reflectivity", 0, 1);
  gui.add(material, "clearcoat", 0, 1).step(0.01);
  gui.add(material, "clearcoatRoughness", 0, 1).step(0.01);
  gui.add(material, "wireframe");
  gui.add(material, "wireframeLinewidth", 0, 10);
  gui.add(material, "fog");
}

export function guiAddMesh(gui: GUI, mesh: THREE.Mesh, range = 10): void {
  gui.add(mesh.position, "x", -range, range);
  gui.add(mesh.position, "y", -range, range);
  gui.add(mesh.position, "z", -range, range);
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

  let normals;
  if (mesh.normals) {
    normals = new Float32Array(mesh.normals.length * 3);
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
