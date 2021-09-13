import { mat4, vec3 } from "lib/vec-math";
import * as quads from "lib/quads";
import createRandom from "@tatumcreative/random";
import { Regl, DefaultContext } from "lib/regl";
import { createWithModel, ModelContext } from "lib/draw/with-model";
import lerp from "lerp";
const simplex = new (require("simplex-noise"))();

export function createCuttleFish() {
  return {
    mask: createMask(),
    body: createMaskBody(),
  };
}

export function createMask(): QuadMesh {
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
  // shapeNose(mesh);
  extrudeTentacles(mesh);
  quads.subdivide(mesh, 2);
  return mesh;
}

function shapeEyes(mesh: QuadMesh): void {
  // Make the eyes glare.
  [27, 19, 20, 28].forEach((i) => {
    mesh.positions[i][0] *= 0.5;
    mesh.positions[i][1] -= 0.1;
  });
  const leftEyePositions = quads.getLoopHorizontal(
    mesh,
    mesh.quads[31],
    "positions"
  );
  const rightEyePositions = quads.getLoopHorizontal(
    mesh,
    mesh.quads[27],
    "positions"
  );
  // Make the eyes glare.
  const cfg = [
    { positions: leftEyePositions, dir: 1 },
    { positions: rightEyePositions, dir: -1 },
  ];
  for (const { positions, dir } of cfg) {
    const origin: Tuple3 = [0, 0, 0];
    for (const position of positions) {
      vec3.scale(position, position, 0.8);
      position[0] += 0.02 * dir;
      position[1] += 0.01;
      position[2] += 0.05;
      vec3.add(origin, origin, position);
    }
    vec3.divide(origin, origin, [
      positions.length,
      positions.length,
      positions.length,
    ]);
    for (const position of positions) {
      vec3.rotateY(position, position, origin, Math.PI * 0.13 * dir);
    }
  }
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

function extrudeTentacles(mesh: QuadMesh): void {
  quads.computeSmoothNormals(mesh);

  const random = createRandom(11);
  const lowerThanY = -0.1;
  // For the bottom row of tentacles.
  const bottomLoopQuads = quads
    .getLoopVertical(mesh, mesh.quads[30], "quads")
    .filter(unique)
    .filter(
      (quad) =>
        mesh.positions[quad[0]][1] +
          mesh.positions[quad[1]][1] +
          mesh.positions[quad[2]][1] +
          mesh.positions[quad[3]][1] <
        lowerThanY * 4
    );

  // Generate the top row of tentacles
  const topLoopQuads = [
    // Right eye's bottom ones.
    45, 46, 50,
    // The two quads in the middle.
    25, 26,
    // The lef eye's bottom ones.
    73, 77, 78,
  ].map((quad) => mesh.quads[quad]);
  const bothLoops = [...topLoopQuads, ...bottomLoopQuads];

  rotateQuadsX(mesh, bothLoops, Math.PI * 0.3);
  rotateQuadsX(mesh, bottomLoopQuads, Math.PI * -0.2);
  randomizeQuadRotation(mesh, bothLoops, 3.0, Math.PI * 0.15);

  const INITIAL_ROTATE = -0.4;
  const EXTRUDE_INSET = 0.15;
  const EXTRUDE_LENGTH = 0.012;
  const ROTATE_GROWTH = 0.2;
  const SEGMENTS = 10;

  function recursiveExtrude(
    quad: Quad,
    extrudeLength: number,
    rotate = INITIAL_ROTATE,
    segments = SEGMENTS
  ) {
    if (segments === 0) {
      return;
    }
    quads.extrude(mesh, quad, EXTRUDE_INSET, extrudeLength * EXTRUDE_LENGTH);
    const positions = quads.getPositions(mesh, quad);
    const origin = getPositionCenter(positions);
    for (const position of positions) {
      vec3.rotateX(position, position, origin, rotate);
    }
    recursiveExtrude(quad, extrudeLength, rotate + ROTATE_GROWTH, segments - 1);
  }

  let maxX = 0;
  for (const quad of bothLoops) {
    const center = quads.getCenter(mesh, quad);
    maxX = Math.max(center[0], maxX);
  }

  for (const quad of bothLoops) {
    const center = quads.getCenter(mesh, quad);
    const extrudeLength = 1;
    const unitWidth = (maxX - center[0]) / maxX;
    recursiveExtrude(quad, lerp(1, 1.5, unitWidth));
  }
  // bottomLoopQuads.forEach((quad) => extrudeAndRotateCell(mesh, quad, random));
  // bottomLoopQuads.forEach((quad) => quads.extrude(mesh, quad, 0.01, 0.005));
  // bottomLoopQuads.forEach((quad) => extrudeAndRotateCell(mesh, quad, random));
  // bottomLoopQuads.forEach((quad) => quads.extrude(mesh, quad, 0.01, 0.025));
  // bottomLoopQuads.forEach((quad) => extrudeAndRotateCell(mesh, quad, random));
  // bottomLoopQuads.forEach((quad) => quads.extrude(mesh, quad, 0.01, 0.025));
  // bottomLoopQuads.forEach((quad) => extrudeAndRotateCell(mesh, quad, random));
}

function rotateQuadsX(mesh: QuadMesh, quadList: Quad[], theta: number) {
  const topLoopPositions = quads.getPositionsSet(mesh, quadList);
  const topLoopCenter = vec3.create();
  for (const p of topLoopPositions) {
    vec3.add(topLoopCenter, topLoopCenter, p);
  }
  topLoopCenter[0] /= topLoopPositions.size;
  topLoopCenter[1] /= topLoopPositions.size;
  topLoopCenter[2] /= topLoopPositions.size;
  for (const p of topLoopPositions) {
    vec3.rotateX(p, p, topLoopCenter, theta);
  }
}

function randomizeQuadRotation(
  mesh: QuadMesh,
  quadList: Quad[],
  waveLength: number,
  waveHeight: number
) {
  for (const quad of quadList) {
    const center = quads.getCenter(mesh, quad);
    for (const p of quads.getPositions(mesh, quad)) {
      vec3.rotateY(
        p,
        p,
        center,
        simplex.noise3D(
          p[0] * waveLength,
          p[1] * waveLength,
          p[2] * waveLength
        ) * waveHeight
      );
    }
  }
}

function getPositionCenter(positions: Tuple3[]): Tuple3 {
  const center: Tuple3 = [0, 0, 0];
  for (const position of positions) {
    vec3.add(center, center, position);
  }
  center[0] /= positions.length;
  center[1] /= positions.length;
  center[2] /= positions.length;
  return center;
}

function unique(value: any, index: any, self: Array<any>) {
  return self.indexOf(value) === index;
}

function createMaskBody(): QuadMesh {
  // Create a box.
  const w = 0.36;
  const h = 1.4;
  const d = 0.4;
  const mesh = quads.createBox(w, h, d);
  mesh.quads.splice(1, 1);
  mesh.positions.forEach((p) => {
    p[1] -= 0.5;
    p[2] -= 0.05;
  });
  [0, 1, 2, 3].forEach((i) => {
    const position = mesh.positions[i];
    position[0] *= 3.75;
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

  return createWithModel(regl, "head", ({ time }: DefaultContext) => {
    center[0] = simplex.noise2D(time * 0.1, 0) * 0.05;
    center[1] = simplex.noise2D(time * 0.1, 10) * 0.025 - 0.15;
    up[0] = simplex.noise2D(time * 0.1, 10) * 0.25;
    eye[0] = simplex.noise2D(time * 0.05, 0) * 0.25;
    // return mat4.identity(out)
    return mat4.lookAt(out, center, eye, up);
  });
}
