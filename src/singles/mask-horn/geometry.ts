import { mat4, vec3 } from "lib/vec-math";
import * as quads from "lib/quads";
import createRandom from "@tatumcreative/random";
import { Regl, DefaultContext } from "lib/regl";
import { createWithModel, ModelContext } from "lib/draw/with-model";
import lerp from "lerp";
import { rad } from "lib/utils";

export function createCuttleFish() {
  return {
    mask: createMask(),
    body: createMaskBody(),
  };
}

const MASK_BOX_W = 0.2;
const MASK_BOX_H = 0.1;
const MASK_BOX_D = 0.4;
const MASK_THICKNESS = 0.2;
const EYE_HOLE_SIZE = 0.5;
const EYE_HEIGHT = 0.02;
const EYE_INSET_SCALE = 0.7;
const EYE_ROTATION = 0.3;
const EYE_SCALE = 1;
const SNOUT_WIDTH_SCALE = 0.7;
const SNOUT_DIP_DOWN = 0.09;
const CHEEK_WIDTH_SCALE = 1.2;
const CHEEK_PULL_DOWN = 0.02;
const HORN_BASE_WIDTH = 0.12;
const HORN_BASE_HEIGHT = 0.02;
const HORN_BASE_ROTATION_Z = rad(-0.3);
const HORN_BASE_ROTATION_X = rad(0);
const HORN_BASE_POSITION = [0.08, 0.07, -0.2] as Tuple3;
const HORN_EXTRUSION_COUNT = 10;
const HORN_EXTRUSION_INSET = 0.18;
const HORN_EXTRUSION_EXTRUSION = 0.02;
const HORN_ROTATION_X = rad(0.2);
const HORN_ROTATION_Y = rad(0);
const HORN_ROTATION_Z = rad(0);
const HORN_PUFF = true;
const HORN_PUFF_INSET = 0.2;
const HORN_PUFF_SCALE = 1.2;
const MODEL_ROTATE = rad(0.2);
const BODY_W = 0.16;
const BODY_H = 1.1;
const BODY_D = 0.4;
const BODY_X = 0;
const BODY_Y = -0.45;
const BODY_Z = -0.17;

const ORIGIN: Tuple3 = [0, 0, 0];

export function createMask(): QuadMesh {
  // Create a box.
  const mesh = quads.createBox(MASK_BOX_W, MASK_BOX_H, MASK_BOX_D);

  // Front View: Inset the 2 outer sides to build this shape
  // *-*-*--------------*-*-*
  // | | |              | | |
  // | | |              | | |
  // *-*-*--------------*-*-*
  quads.insetLoopVertical(mesh, mesh.quads[3], MASK_THICKNESS);
  quads.insetLoopVertical(
    mesh,
    mesh.quads[10],
    MASK_THICKNESS / (1 - MASK_THICKNESS)
  );

  // Front View: Bring up this portion
  // *-*-*--------------*-*-*
  // | | *--------------* | |
  // | | /              \ | |
  // *-*                  *-*
  for (const p of quads.getPositions(mesh, mesh.quads[19])) {
    p[1] += MASK_BOX_H - MASK_BOX_H * MASK_THICKNESS;
  }

  // Side View: Split this.
  // *-------------*---------------*
  // |             |               |
  // |             |               |
  // *-------------*---------------*
  quads.splitLoopHorizontal(mesh, mesh.quads[2], 0.5);

  // Side View: Make the eye holes
  // *-------------*---------------*
  // |\           /|               |
  // |  *-------*  |               |
  // |  |       |  |               |
  // |  *-------*  |               |
  // |/           \|               |
  // *-------------*---------------*
  quads.tunnel(mesh, mesh.quads[22], mesh.quads[32], EYE_HOLE_SIZE);
  quads.tunnel(mesh, mesh.quads[28], mesh.quads[30], EYE_HOLE_SIZE);

  // Front View: Split the front of it.
  // *-*-*------*-------*-*-*
  // | | |      |       * | |
  // | | *------*-------* | |
  // | | /              \ | |
  // *-*                  *-*
  quads.splitLoopVertical(mesh, mesh.quads[21], 0.5);

  for (const p of quads.getPositionsSet(mesh, 25, 59)) {
    // Raise the top back of the head.
    p[0] *= 0.5;
    p[1] += 0.03;
  }
  for (const p of quads.getPositionsSet(mesh, 23, 27)) {
    // Move the top of the eyes in.
    p[0] *= EYE_INSET_SCALE;
  }
  for (const p of quads.getLoopHorizontal(mesh, 23, "positions")) {
    // Make the eyes taller.
    p[1] += EYE_HEIGHT;
  }

  // Split the snout
  // *-------------*-------*-------*
  // |\           /|       |       *
  // |  *-------*  |       |       |
  // |  |       |  |       |       |
  // |  *-------*  |       |       |
  // |/           \|       |       |
  // *-------------*-------*-------*
  quads.splitLoopHorizontal(mesh, 2);

  // Adjust the snout down.
  for (const p of quads.getLoopHorizontal(mesh, 2, "positions")) {
    p[0] *= SNOUT_WIDTH_SCALE;
    p[1] *= SNOUT_WIDTH_SCALE;
    p[1] -= SNOUT_DIP_DOWN;
  }

  // Extrude out spikey things.
  for (const { quad, inset, extrude, x, y, count } of [
    // Front side of snout
    { quad: 3, inset: 0.5, extrude: 0.005, x: 0.8, y: -0.02, count: 3 },
    { quad: 6, inset: 0.5, extrude: 0.005, x: 0.8, y: -0.02, count: 3 },
    // Front inner snout
    { quad: 18, inset: 0.5, extrude: 0.005, x: 0.8, y: -0.015, count: 2 },
    { quad: 55, inset: 0.5, extrude: 0.005, x: 0.8, y: -0.015, count: 2 },
    // Back of head, sides
    { quad: 5, inset: 0.5, extrude: 0.01, x: 1.2, y: 0, count: 2 },
    { quad: 8, inset: 0.5, extrude: 0.01, x: 1.2, y: 0, count: 2 },
    // Back of head, top
    { quad: 20, inset: 0.5, extrude: 0.012, x: 1.2, y: 0.02, count: 2 },
    { quad: 58, inset: 0.5, extrude: 0.012, x: 1.2, y: 0.02, count: 2 },
    // Back of head, top/side
    { quad: 123, inset: 0.5, extrude: 0.01, x: 1, y: 0.005, count: 2 },
    { quad: 115, inset: 0.5, extrude: 0.01, x: 1, y: 0.005, count: 2 },
    // // Back of head, side
    { quad: 111, inset: 0.5, extrude: 0.004, x: 1, y: 0.005, count: 2 },
    { quad: 119, inset: 0.5, extrude: 0.004, x: 1, y: 0.005, count: 2 },
  ]) {
    for (let i = 0; i < count; i++) {
      const positions = quads.getNewGeometry(mesh, "positions", () => {
        quads.extrude(mesh, quad, inset, extrude);
      });
      for (const p of positions) {
        p[0] *= x;
        p[1] += y;
      }
    }
  }

  // Adjust the eyes rotation and scale. Also make them sharper.
  for (const { quad, rotation, scale } of [
    { quad: 43, rotation: EYE_ROTATION, scale: EYE_SCALE },
    { quad: 53, rotation: -EYE_ROTATION, scale: EYE_SCALE },
  ]) {
    quads.centeredPositionsTransform(
      quads.getLoopVertical(mesh, quad, "positions"),
      (p) => {
        vec3.rotateY(p, p, ORIGIN, rotation);
        p[0] *= scale;
        p[1] *= scale;
        p[2] *= scale;
      }
    );
    quads.insetLoopVertical(mesh, quad, 0.5);
  }

  // Adjust the checkbones down.
  for (const quad of [33, 29]) {
    for (const p of quads.getPositions(mesh, quad)) {
      p[0] *= CHEEK_WIDTH_SCALE;
      p[1] -= CHEEK_PULL_DOWN;
    }
  }

  createHorns(mesh);

  quads.subdivide(mesh, 3);
  return mesh;
}

function createHorns(mesh: QuadMesh) {
  const quadList = quads.getNewGeometry(mesh, "quads", () => {
    const positions = quads.getNewGeometry(mesh, "positions", () => {
      quads.createBox(HORN_BASE_WIDTH, HORN_BASE_HEIGHT, HORN_BASE_WIDTH, mesh);
    });
    for (const p of positions) {
      vec3.rotateZ(p, p, ORIGIN, HORN_BASE_ROTATION_Z);
      vec3.rotateX(p, p, ORIGIN, HORN_BASE_ROTATION_X);
      vec3.add(p, p, HORN_BASE_POSITION);
    }
    const baseQuad = mesh.quads.length - 6;
    const baseCenter = vec3.create();
    for (let i = 0; i < HORN_EXTRUSION_COUNT; i++) {
      quads.getCenter(mesh, baseQuad, baseCenter);
      quads.extrude(
        mesh,
        baseQuad,
        HORN_EXTRUSION_INSET,
        HORN_EXTRUSION_EXTRUSION
      );
      for (const p of quads.getPositions(mesh, baseQuad)) {
        vec3.rotateX(p, p, baseCenter, HORN_ROTATION_X);
        vec3.rotateY(p, p, baseCenter, HORN_ROTATION_Y);
        vec3.rotateZ(p, p, baseCenter, HORN_ROTATION_Z);
      }
    }
    // Ensure the last one is pointy
    quads.centeredTransform(mesh, [baseQuad], (p) => {
      p[0] *= 0.25;
      p[1] *= 0.25;
      p[2] *= 0.25;
    });

    if (!HORN_PUFF) {
      return;
    }
    const loop = quads.getLoopHorizontal(mesh, baseQuad, "quads");
    for (let i = 0; i < HORN_EXTRUSION_COUNT + 1; i++) {
      const quad = loop[i];
      if (quad === mesh.quads[baseQuad]) {
        continue;
      }
      const insetPositions = quads.getNewGeometry(mesh, "positions", () => {
        quads.insetLoopHorizontal(mesh, quad, HORN_PUFF_INSET);
      });
      quads.centeredPositionsTransform(insetPositions, (p) => {
        p[0] *= HORN_PUFF_SCALE;
        p[1] *= HORN_PUFF_SCALE;
        p[2] *= HORN_PUFF_SCALE;
      });
    }

    // quads.splitLoopHorizontal(mesh, baseQuad, 0.5);
  });

  quads.mirror(mesh, quadList, "x");
}

function createMaskBody(): QuadMesh {
  // Create a box.
  const w = BODY_W;
  const h = BODY_H;
  const d = BODY_D;
  const mesh = quads.createBox(w, h, d);
  mesh.quads.splice(1, 1);
  mesh.positions.forEach((p) => {
    p[0] += BODY_X;
    p[1] += BODY_Y;
    p[2] += BODY_Z;
  });
  [0, 1, 2, 3].forEach((i) => {
    const position = mesh.positions[i];
    position[0] *= 6.75;
    position[1] *= 1.5;
    position[2] *= 1.5;
    position[2] -= 0.5;
  });
  quads.splitLoopHorizontal(mesh, mesh.quads[2], 0.9);
  quads.subdivide(mesh, 3);
  return mesh;
}

export function createWithMaskModel(regl: Regl) {
  const out = mat4.create();
  const eye: Tuple3 = [0, 0, -1];
  const center: Tuple3 = [0, 0, 0];
  const up: Tuple3 = [0, 1, 0];
  const simplex = new (require("simplex-noise"))();
  const model = mat4.rotateX([], mat4.identity([]), MODEL_ROTATE);

  return createWithModel(regl, "head", ({ time }: DefaultContext) => {
    center[0] = simplex.noise2D(time * 0.1, 0) * 0.05;
    center[1] = simplex.noise2D(time * 0.1, 10) * 0.025 - 0.15;
    up[0] = simplex.noise2D(time * 0.1, 10) * 0.25;
    eye[0] = simplex.noise2D(time * 0.05, 0) * 0.25;
    mat4.lookAt(out, center, eye, up);
    mat4.multiply(out, model, out);
    return out;
  });
}
