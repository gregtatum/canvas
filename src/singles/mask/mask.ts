import glsl from "glslify";
import { DefaultContext, Regl, Texture } from "lib/regl";

import { mat4, vec3 } from "lib/vec-math";
import * as quads from "lib/quads";
import createRandom from "@tatumcreative/random";
import { accessors, drawCommand } from "lib/regl-helpers";
import { matcap } from "lib/shaders";
import { createWithModel, ModelContext } from "lib/draw/with-model";

const simplex = new (require("simplex-noise"))();

export type MaskContext = ModelContext<"head">;

export function createMask(regl: Regl) {
  const maskMesh = createGeometry();

  return {
    drawMask: createDrawMask(regl, maskMesh),
    maskMesh,
    withMaskModel: createWithMaskModel(regl),
  };
}

function createWithMaskModel(regl: Regl) {
  const out = mat4.create();
  const eye: Tuple3 = [0, 0, -1];
  const center: Tuple3 = [0, 0, 0];
  const up: Tuple3 = [0, 1, 0];

  return createWithModel(regl, "head", ({ time }: DefaultContext) => {
    center[0] = simplex.noise2D(time * 0.1, 0) * 0.05;
    center[1] = simplex.noise2D(time * 0.1, 10) * 0.025;
    up[0] = simplex.noise2D(time * 0.1, 10) * 0.25;
    eye[0] = simplex.noise2D(time * 0.05, 0) * 0.25;
    // return mat4.identity(out)
    return mat4.lookAt(out, center, eye, up);
  });
}

export interface MaskProps {
  matcapTexture: Texture;
}

function createDrawMask(regl: Regl, mesh: QuadMesh) {
  const { getProp, getContext } = accessors<MaskProps, MaskContext>();
  return drawCommand<MaskProps, MaskContext>(regl, {
    name: "drawMask",
    vert: glsl`
      precision mediump float;
      uniform vec3 cameraPosition;
      attribute vec3 normal, position;
      uniform mat3 viewNormal, modelNormal;
      uniform mat4 model, projView;
      varying vec3 vNormal, vViewPosition;

      void main() {
        vNormal = viewNormal * modelNormal * normal;
        vec4 worldPosition = model * vec4(position, 1.0);
        vViewPosition = cameraPosition - worldPosition.xyz;
        gl_Position = projView * worldPosition;
      }
    `,
    frag: glsl`
      precision mediump float;
      ${matcap}
      uniform sampler2D matcapTexture;
      varying vec3 vNormal, vViewPosition;

      void main() {
        vec2 uv = matcap(normalize(vViewPosition), normalize(vNormal));
        vec3 color = texture2D(matcapTexture, uv).rgb;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    attributes: {
      position: mesh.positions,
      normal: mesh.normals,
    },
    uniforms: {
      matcapTexture: getProp("matcapTexture"),
      model: getContext("headModel"),
      modelNormal: getContext("headModelNormal"),
    },
    elements: quads.getElements(mesh, "triangle"),
    primitive: "triangles",
    cull: { enable: true },
  });
}

function createGeometry() {
  // Create a box.
  const w = 0.5;
  const h = 0.3;
  const d = 0.1;
  const mesh = quads.createBox(w, h, d);

  // Split the box in half.
  const centerRing = quads.getNewGeometry(mesh, "positions", () => {
    quads.splitLoopVertical(mesh, mesh.quads[3], 0.6);
    quads.splitLoopVertical(mesh, mesh.quads[3], 0.75);
  });
  createEyeHoles(mesh, w, h, d);
  // Adjust nose shape.
  centerRing.forEach((p) => {
    p[2] += 0.1;
    if (p[1] < 0) {
      p[2] += 0.1;
    }
  });
  shapeEyes(mesh);
  shapeMaskBack(mesh);
  quads.subdivide(mesh, 1);
  refineEyes(mesh);
  shapeNose(mesh);
  extrudeHair(mesh);
  quads.subdivide(mesh, 3);
  return mesh;
}

function shapeEyes(quads: QuadMesh): void {
  [27, 19, 20, 28].forEach((i) => {
    quads.positions[i][0] *= 0.5;
    quads.positions[i][1] -= 0.1;
  });
}

function shapeMaskBack(quads: QuadMesh): void {
  [0, 3].forEach((i) => {
    quads.positions[i][0] *= 1.2;
    quads.positions[i][1] -= 0.1;
    quads.positions[i][2] -= 0.1;
  });
}

function createEyeHoles(mesh: QuadMesh, w: number, h: number, d: number) {
  // Create some eye-holes.
  const leftEyeFrontIndex = 3;
  const leftEyeBackIndex = 5;
  const rightEyeFrontIndex = 6;
  const rightEyeBackIndex = 8;
  const leftEyeFront = mesh.quads[leftEyeFrontIndex];
  const leftEyeBack = mesh.quads[leftEyeBackIndex];
  const rightEyeFront = mesh.quads[rightEyeFrontIndex];
  const rightEyeBack = mesh.quads[rightEyeBackIndex];

  quads.inset(mesh, leftEyeFront, 0.5);
  quads.inset(mesh, leftEyeBack, 0.5);
  quads.inset(mesh, rightEyeFront, 0.5);
  quads.inset(mesh, rightEyeBack, 0.5);

  quads.extrude(mesh, leftEyeFront, 0, 0);
  quads.extrude(mesh, rightEyeFront, 0, 0);

  leftEyeFront.forEach((i) => (mesh.positions[i][2] = -d / 2));
  rightEyeFront.forEach((i) => (mesh.positions[i][2] = -d / 2));
  mesh.quads.splice(8, 1);
  mesh.quads.splice(6, 1);
  mesh.quads.splice(5, 1);
  mesh.quads.splice(3, 1);
  quads.mergePositions(mesh);
}

function refineEyes(mesh: QuadMesh): void {
  for (const { quadIndex, quadIndex2 } of [
    // Inner nose quad on the right side of the mask.
    { quadIndex: 48, quadIndex2: 146 },
    // Inner nose quad on the left side of the mask.
    { quadIndex: 75, quadIndex2: 194 },
  ]) {
    const quad = mesh.quads[quadIndex];
    quads.insetLoopVertical(mesh, quad, 0.05);

    const ring = quads.getNewGeometry(mesh, "positions", () => {
      quads.insetLoopVertical(mesh, quad, 0.0);
      quads.insetLoopVertical(mesh, quad, 0.05);
    });

    // Move the eye loops forward a bit.
    (
      quads.getLoopHorizontal(
        mesh,
        mesh.quads[quadIndex2],
        "quads"
      ) as number[][]
    )
      .reduce((a, b): number[] => a.concat(b))
      .map((i) => mesh.positions[i])
      .concat(ring)
      .filter(unique)
      .forEach((p) => (p[2] += 0.01));
  }
}

function shapeNose(mesh: QuadMesh): void {
  // Adjust some positions.
  [42, 43, 46].forEach((i) => {
    mesh.positions[i][2] -= 0.05;
  });
  const noseTip = mesh.quads[25];
  quads.splitLoopHorizontal(mesh, noseTip, 0.2);
  [230, 231, 232].forEach((i) => {
    mesh.positions[i][0] *= 2;
    mesh.positions[i][1] += 0.05;
    mesh.positions[i][2] += 0.05;
  });
}

function extrudeHair(mesh: QuadMesh): void {
  // Adjust top rim sizing of the mask
  // Top row back
  mesh.positions[53][2] -= 0.028;
  mesh.positions[51][2] -= 0.028;
  mesh.positions[7][2] -= 0.015;
  mesh.positions[37][2] -= 0.015;

  mesh.positions[7][1] += 0.015;
  mesh.positions[37][1] += 0.015;

  // Bottom Row back
  mesh.positions[36][2] -= 0.03;
  mesh.positions[51][2] -= 0.03;
  mesh.positions[8][2] -= 0.03;
  quads.computeSmoothNormals(mesh);

  quads.splitLoopVertical(mesh, mesh.quads[10], 0.5);
  quads.splitLoopHorizontal(mesh, mesh.quads[9], 0.5);
  quads.splitLoopHorizontal(mesh, mesh.quads[13], 0.5);
  quads.splitLoopVertical(mesh, mesh.quads[14], 0.5);

  const random = createRandom(11);
  const faces = quads
    .getLoopVertical(mesh, mesh.quads[0], "quads")
    .filter(unique)
    .filter(
      (quad) =>
        mesh.positions[quad[0]][1] +
          mesh.positions[quad[1]][1] +
          mesh.positions[quad[2]][1] +
          mesh.positions[quad[3]][1] >
        -0.4
    );

  faces.forEach((quad) => extrudeAndRotateCell(mesh, quad, random));
  faces.forEach((quad) => quads.extrude(mesh, quad, 0.1, 0.005));
  faces.forEach((quad) => extrudeAndRotateCell(mesh, quad, random));
  faces.forEach((quad) => quads.extrude(mesh, quad, 0.25, 0.025));
  faces.forEach((quad) => extrudeAndRotateCell(mesh, quad, random));
  faces.forEach((quad) => quads.extrude(mesh, quad, 0.25, 0.025));
  faces.forEach((quad) => extrudeAndRotateCell(mesh, quad, random));
}

function extrudeAndRotateCell(
  mesh: QuadMesh,
  quad: Quad,
  random: () => number
) {
  quads.extrude(mesh, quad, 0.5, 0.025);
  const range = 0.4;
  const rotateA = random() * range - range / 2;
  const rotateB = random() * range - range / 2;

  quad.forEach((i) => {
    const position = mesh.positions[i];
    vec3.rotateZ(position, position, [0, 0, 0], rotateA);
    vec3.rotateY(position, position, [0, 0, 0], rotateB);
    position[2] -= 0.1;
  });
}

function unique(value: any, index: any, self: Array<any>) {
  return self.indexOf(value) === index;
}
