import glsl from "glslify";
import { Regl, Texture } from "regl";

import { vec3 } from "../lib/vec-math";
import * as quads from "../lib/quads";
import createRandom from "@tatumcreative/random";
import { SceneContext } from "./scene";
import { accessors, drawCommand } from "../lib/regl";
import { matcap } from "../lib/shaders";

export default function mainMask(regl: Regl) {
  const maskMesh = createGeometry();

  return {
    drawMask: createDrawMask(regl, maskMesh),
    maskMesh,
  };
}

export interface MaskProps {
  matcapTexture: Texture;
}

function createDrawMask(regl: Regl, mesh: QuadMesh) {
  const { getProp, getContext } = accessors<MaskProps, SceneContext>();
  return drawCommand<MaskProps, SceneContext>(regl, {
    vert: glsl`
      precision mediump float;
      attribute vec3 normal, position;
      uniform mat4 model, view, projection;
      varying vec3 vNormal;

      void main() {
        vNormal = normal;
        gl_Position = projection * view * model * vec4(position, 1.0);
      }
    `,
    frag: glsl`
      precision mediump float;
      ${matcap}
      uniform vec3 cameraPosition;
      uniform sampler2D matcapTexture;
      varying vec3 vNormal;

      void main() {
        vec3 normal = normalize(vNormal);
        vec2 uv = matcap(cameraPosition, normal);
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
    quads.splitLoop(mesh, mesh.quads[3], 0.6);
    quads.splitLoop(mesh, mesh.quads[3], 0.75);
  });
  createEyeHoles(mesh, w, h, d);
  // Adjust nose shape.
  centerRing.forEach(p => {
    p[2] += 0.1;
    if (p[1] < 0) {
      p[2] += 0.1;
    }
  });
  shapeEyes(mesh);
  shapeMaskBack(mesh);
  refineEyes(mesh);
  // shapeNose(mesh);
  // extrudeHair(mesh);
  // quads.subdivide(mesh, 2);
  return mesh;
}

function shapeEyes(quads: QuadMesh): void {
  [27, 19, 20, 28].forEach(i => {
    quads.positions[i][0] *= 0.5;
    quads.positions[i][1] -= 0.1;
  });
}

function shapeMaskBack(quads: QuadMesh): void {
  [0, 3].forEach(i => {
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

  leftEyeFront.forEach(i => (mesh.positions[i][2] = -d / 2));
  rightEyeFront.forEach(i => (mesh.positions[i][2] = -d / 2));
  mesh.quads.splice(8, 1);
  mesh.quads.splice(6, 1);
  mesh.quads.splice(5, 1);
  mesh.quads.splice(3, 1);
  quads.mergePositions(mesh);
}

function refineEyes(mesh: QuadMesh): void {
  quads.subdivide(mesh, 1);
  [
    { quadIndex: 48, opposite: true },
    { quadIndex: 75, opposite: false },
  ].forEach(({ quadIndex, opposite }) => {
    const quad = mesh.quads[quadIndex];
    quads.insetLoop(mesh, quad, 0.05, opposite);

    const ring = quads.getNewGeometry(mesh, "positions", () => {
      quads.insetLoop(mesh, quad, 0.0, opposite);
      quads.insetLoop(mesh, quad, 0.05, opposite);
    });

    (quads.getLoop(mesh, mesh.quads[146], "quads") as number[][])
      .reduce((a, b): number[] => a.concat(b))
      .map(i => mesh.positions[i])
      .concat(ring)
      .filter(unique)
      .forEach(p => (p[2] += 0.01));
  });
}

function shapeNose(mesh: QuadMesh): void {
  [42, 43, 46].forEach(i => {
    mesh.positions[i][2] -= 0.05;
  });

  // quads.splitLoop(mesh, mesh.quads[25], 0.2, true);
  // [230, 231, 232].forEach(i => {
  //   mesh.positions[i][0] *= 2;
  //   mesh.positions[i][1] += 0.05;
  //   mesh.positions[i][2] += 0.05;
  // });
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
  quads.computeNormals(mesh);

  quads.splitLoop(mesh, mesh.quads[10], 0.5, true);
  quads.splitLoop(mesh, mesh.quads[9], 0.5);
  quads.splitLoop(mesh, mesh.quads[13], 0.5);
  quads.splitLoop(mesh, mesh.quads[14], 0.5, true);

  const random = createRandom(11);
  const faces = quads
    .getLoop(mesh, mesh.quads[0], "quads", true)
    .filter(unique)
    .filter(
      quad =>
        mesh.positions[quad[0]][1] +
          mesh.positions[quad[1]][1] +
          mesh.positions[quad[2]][1] +
          mesh.positions[quad[3]][1] >
        -0.4
    );

  faces.forEach(quad => extrudeAndRotateCell(mesh, quad, random));
  faces.forEach(quad => quads.extrude(mesh, quad, 0.1, 0.005));
  faces.forEach(quad => extrudeAndRotateCell(mesh, quad, random));
  faces.forEach(quad => quads.extrude(mesh, quad, 0.25, 0.025));
  faces.forEach(quad => extrudeAndRotateCell(mesh, quad, random));
  faces.forEach(quad => quads.extrude(mesh, quad, 0.25, 0.025));
  faces.forEach(quad => extrudeAndRotateCell(mesh, quad, random));
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

  quad.forEach(i => {
    const position = mesh.positions[i];
    vec3.rotateZ(position, position, [0, 0, 0], rotateA);
    vec3.rotateY(position, position, [0, 0, 0], rotateB);
    position[2] -= 0.1;
  });
}

function unique(value: any, index: any, self: Array<any>) {
  return self.indexOf(value) === index;
}
