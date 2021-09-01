import { CanvasTexture, MeshPhysicalMaterial } from "three";
import { GUI } from "dat.gui";

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
