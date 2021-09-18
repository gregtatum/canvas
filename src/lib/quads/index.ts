import { vec3 } from "../vec-math";
import { ensureExists, UnhandledCaseError } from "../utils";
import { catmullClarkSubdivision } from "./catmull-clark";

/**
 * Split a quad horizontally.
 *
 * ```
 *  b---bc---c
 *  |   |    |
 *  |   |    |
 *  a---ad---d
 * ```
 */
export function splitVertical(
  mesh: QuadMesh,
  targetQuad: Quad,
  t: UnitInterval = 0.5
) {
  const { positions, quads, normals } = mesh;
  const [a, b, c, d] = targetQuad;
  const positionA = positions[a];
  const positionB = positions[b];
  const positionC = positions[c];
  const positionD = positions[d];
  const bcPosition = vec3.lerp([], positionB, positionC, t);
  const adPosition = vec3.lerp([], positionA, positionD, t);
  const bc = positions.length;
  const ad = bc + 1;
  positions[bc] = bcPosition;
  positions[ad] = adPosition;
  targetQuad[2] = bc;
  targetQuad[3] = ad;
  quads.push([ad, bc, c, d]);
  if (normals) {
    normals[bc] = normals[b];
    normals[ad] = normals[a];
  }
}

/**
 * Split a quad horizontally into two new disconnected quads.
 *
 * ```
 *  b---bc1  bc2---c
 *  |     |  |     |
 *  |     |  |     |
 *  a---ad1  ad2---d
 * ```
 */
export function splitVerticalDisjoint(
  mesh: QuadMesh,
  targetQuad: Quad,
  t: UnitInterval = 0.5
) {
  const { positions, quads, normals } = mesh;
  const [a, b, c, d] = targetQuad;
  const bc1 = positions.length;
  const ad1 = bc1 + 1;
  const bc2 = bc1 + 2;
  const ad2 = bc1 + 3;

  // Add the positions
  const bcPosition = vec3.lerp([], positions[b], positions[c], t);
  const adPosition = vec3.lerp([], positions[a], positions[d], t);
  positions[bc1] = bcPosition;
  positions[ad1] = adPosition;
  positions[bc2] = vec3.clone(bcPosition);
  positions[ad2] = vec3.clone(adPosition);

  // Update the quads
  targetQuad[2] = bc1;
  targetQuad[3] = ad1;
  quads.push([ad2, bc2, c, d]);

  // Normals - assume that disjoint splits all share the same normal.
  if (normals) {
    const normal = normals[a];
    normals[ad1] = vec3.clone(normal);
    normals[ad2] = vec3.clone(normal);
    normals[bc1] = vec3.clone(normal);
    normals[bc2] = vec3.clone(normal);
  }
}

/**
 * Split a quad horizontally.
 *
 * ```
 *  b--------c
 *  |        |
 *  ab------cd
 *  |        |
 *  a--------d
 * ```
 */
export function splitHorizontal(mesh: QuadMesh, targetQuad: Quad, t = 0.5) {
  const { positions, quads, normals } = mesh;
  const [a, b, c, d] = targetQuad;
  const positionA = positions[a];
  const positionB = positions[b];
  const positionC = positions[c];
  const positionD = positions[d];
  const abPosition = vec3.lerp([], positionB, positionA, t);
  const cdPosition = vec3.lerp([], positionC, positionD, t);
  const ab = positions.length;
  const cd = ab + 1;
  positions[ab] = abPosition;
  positions[cd] = cdPosition;
  targetQuad[1] = ab;
  targetQuad[2] = cd;
  if (normals) {
    normals[ab] = normals[a];
    normals[cd] = normals[d];
  }
  quads.push([ab, b, c, cd]);
}

/**
 * Split a quad horizontally into two new disconnected quads.
 *
 * ```
 *  b--------c
 *  |        |
 *  ab1----cd1
 *  ab2----cd2
 *  | target |
 *  a--------d
 * ```
 */
export function splitHorizontalDisjoint(
  mesh: QuadMesh,
  targetQuad: Quad,
  t = 0.5
) {
  const { positions, quads, normals } = mesh;
  const [a, b, c, d] = targetQuad;
  const ab1 = positions.length;
  const cd1 = ab1 + 1;
  const ab2 = ab1 + 2;
  const cd2 = ab1 + 3;

  // Positions
  const abPosition = vec3.lerp([], positions[a], positions[b], t);
  const cdPosition = vec3.lerp([], positions[d], positions[c], t);
  positions[ab1] = abPosition;
  positions[cd1] = cdPosition;
  positions[ab2] = vec3.clone(abPosition);
  positions[cd2] = vec3.clone(cdPosition);

  // Quads
  targetQuad[0] = ab1;
  targetQuad[3] = cd1;
  quads.push([a, ab2, cd2, d]);

  // Normals - assume that disjoint splits all share the same normal.
  if (normals) {
    const normal = normals[a];
    normals[ab1] = vec3.clone(normal);
    normals[cd1] = vec3.clone(normal);
    normals[ab2] = vec3.clone(normal);
    normals[cd2] = vec3.clone(normal);
  }
}

/**
 * Inset a quad some value between `0` (its edges) and `1` (its center).
 *
 * ```
 *  b----------c
 *  |\   q1   /|
 *  | \      / |
 *  |  f----g  |
 *  |q0| tC |q2| tc = targetQuad
 *  |  e----h  |
 *  | /      \ |
 *  |/   q3   \|
 *  a----------d
 * ```
 *
 */
export const inset = (() => {
  const center: Tuple3 = [0, 0, 0];
  return function(mesh: QuadMesh, targetQuad: Quad | QuadIndex, t = 0) {
    targetQuad = getQuad(mesh, targetQuad);
    const { positions, quads, normals } = mesh;
    const [a, b, c, d] = targetQuad;
    const e = positions.length;
    const f = e + 1;
    const g = f + 1;
    const h = g + 1;
    const positionA = positions[a];
    const positionB = positions[b];
    const positionC = positions[c];
    const positionD = positions[d];

    // Update positions
    center[0] = (positionA[0] + positionB[0] + positionC[0] + positionD[0]) / 4;
    center[1] = (positionA[1] + positionB[1] + positionC[1] + positionD[1]) / 4;
    center[2] = (positionA[2] + positionB[2] + positionC[2] + positionD[2]) / 4;
    positions.push(vec3.lerp([], positionA, center, t));
    positions.push(vec3.lerp([], positionB, center, t));
    positions.push(vec3.lerp([], positionC, center, t));
    positions.push(vec3.lerp([], positionD, center, t));
    if (normals) {
      normals.push(vec3.clone(normals[a]));
      normals.push(vec3.clone(normals[b]));
      normals.push(vec3.clone(normals[c]));
      normals.push(vec3.clone(normals[d]));
    }

    // Update quads
    targetQuad[0] = e;
    targetQuad[1] = f;
    targetQuad[2] = g;
    targetQuad[3] = h;
    const q0: Quad = [a, b, f, e];
    const q1: Quad = [f, b, c, g];
    const q2: Quad = [h, g, c, d];
    const q3: Quad = [a, e, h, d];
    quads.push(q0);
    quads.push(q1);
    quads.push(q2);
    quads.push(q3);
    return [q0, q1, q2, q3, targetQuad];
  };
})();

/**
 * Given a target quad, first inset it, then move it along the quad's normal
 * outwards by a given distance.
 */
export const extrude = (() => {
  const toTranslate: number[] = [];
  const translation: Tuple3 = [0, 0, 0];
  const targetQuadNormal: Tuple3 = [0, 0, 0];
  return function(mesh: QuadMesh, targetQuad: Quad | QuadIndex, insetT = 0, extrude = 0) {
    targetQuad = getQuad(mesh, targetQuad)
    const { positions, normals } = mesh;
    const ring = inset(mesh, targetQuad, insetT);
    const [qL, qT, qR, qB] = ring;

    // Enumerate which positions to translate
    toTranslate[0] = targetQuad[0];
    toTranslate[1] = targetQuad[1];
    toTranslate[2] = targetQuad[2];
    toTranslate[3] = targetQuad[3];

    toTranslate[4] = qL[2];
    toTranslate[5] = qL[3];

    toTranslate[6] = qT[0];
    toTranslate[7] = qT[3];

    toTranslate[8] = qR[0];
    toTranslate[9] = qR[1];

    toTranslate[10] = qB[1];
    toTranslate[11] = qB[2];

    getQuadNormal(mesh, targetQuad, targetQuadNormal);
    vec3.scale(translation, targetQuadNormal, extrude);

    for (let i = 0; i < toTranslate.length; i++) {
      const position = positions[toTranslate[i]];
      vec3.add(position, position, translation);
    }

    // Update all of the affected normals by averaging a position's neighboring
    // quad's normals. This will create some intermediate allocations, that will
    // then be GCed.
    if (normals) {
      const normalCache = new Map();
      normalCache.set(targetQuad, targetQuadNormal);
      const [a, b, c, d] = targetQuad;
      const e = positions.length - 4;
      const f = positions.length - 3;
      const g = positions.length - 2;
      const h = positions.length - 1;
      averageNormalForPosition(mesh, a, normals[a], normalCache);
      averageNormalForPosition(mesh, b, normals[b], normalCache);
      averageNormalForPosition(mesh, c, normals[c], normalCache);
      averageNormalForPosition(mesh, d, normals[d], normalCache);
      averageNormalForPosition(mesh, e, normals[e], normalCache);
      averageNormalForPosition(mesh, f, normals[f], normalCache);
      averageNormalForPosition(mesh, g, normals[g], normalCache);
      averageNormalForPosition(mesh, h, normals[h], normalCache);
    }
  };
})();

export function _calculatePositionIndexToQuads(
  mesh: QuadMesh
): Map<number, Tuple4[]> {
  const toQuads = new Map<number, Tuple4[]>();
  for (let i = 0; i < mesh.quads.length; i++) {
    const quad = mesh.quads[i];
    for (let j = 0; j < quad.length; j++) {
      const index = quad[j];
      let quads = toQuads.get(index);
      if (!quads) {
        quads = [];
        toQuads.set(index, quads);
      }
      quads.push(quad);
    }
  }
  return toQuads;
}

/**
 * Computes the average normal for a position given the connected quads.
 */
// eslint-disable-next-line no-var
export var averageNormalForPosition = (() => {
  const quadCache: Quad[] = [];

  return function averageNormalForPosition(
    mesh: QuadMesh,
    positionIndex: Index,
    target = [0, 0, 0] as Tuple3,
    // A Map can be provided to cache intermediate normal computations.
    normalCache: Map<Quad, Tuple3>,
    // A Map where positionIndex is mapped to its quad, used primarily internally.
    positionIndexToQuads?: Map<Index, Quad[]>
  ) {
    let quads: Quad[];
    if (positionIndexToQuads) {
      quads = ensureExists(positionIndexToQuads.get(positionIndex));
    } else {
      quads = getQuadsFromPositionIndex(mesh, positionIndex, quadCache);
    }
    vec3.set(target, 0, 0, 0);

    // Add neighboring quads' normals
    for (let i = 0; i < quads.length; i++) {
      const quad = quads[i];
      let normal: Tuple3 | void;
      if (normalCache) {
        normal = normalCache.get(quad);
      }
      if (!normal) {
        normal = getQuadNormal(mesh, quad);
        if (normalCache) {
          normalCache.set(quad, normal);
        }
      }
      vec3.add(target, target, normal);
    }
    vec3.normalize(target, target);

    // Clean out the quadCache.
    while (quadCache.length) {
      quadCache.pop();
    }
    return target;
  };
})();

/**
 * Inset a quad some value between `0` (its edges) and `1` (its center), but
 * keep the new quads disjoint so they do not share any positions.
 *
 * ```
 *      bT----------cT
 *  bL   \    qT    /   cR
 *  |\    \        /    /|
 *  | \    fT----gT    / |
 *  |  fL  fM----gM  gR  |
 *  |qL|   |  tC |    |qR|   tC = targetQuad
 *  |  eL  eM----hM  hR  |
 *  | /    eB----hB    \ |
 *  |/    /        \    \|
 *  aL   /    qB    \   dR
 *      aB----------dB
 * ```
 *
 * @returns {Quad[]} quads `[qL, qT, qR, qB, targetQuad]`.
 */
export const insetDisjoint = (() => {
  const center = [0, 0, 0] as Tuple3;
  return function(mesh: QuadMesh, targetQuad: Quad, t = 0) {
    const { positions, quads, normals } = mesh;
    const [a, b, c, d] = targetQuad;
    const positionA = positions[a];
    const positionB = positions[b];
    const positionC = positions[c];
    const positionD = positions[d];

    // Calculate inset positions
    center[0] = (positionA[0] + positionB[0] + positionC[0] + positionD[0]) / 4;
    center[1] = (positionA[1] + positionB[1] + positionC[1] + positionD[1]) / 4;
    center[2] = (positionA[2] + positionB[2] + positionC[2] + positionD[2]) / 4;
    const positionE = vec3.lerp([], positionA, center, t);
    const positionF = vec3.lerp([], positionB, center, t);
    const positionG = vec3.lerp([], positionC, center, t);
    const positionH = vec3.lerp([], positionD, center, t);

    // Assign indices
    const offset = positions.length;
    const aB = offset;
    const aL = a;
    const bL = b;
    const bT = offset + 1;
    const cT = offset + 2;
    const cR = c;
    const dR = d;
    const dB = offset + 3;
    const eM = offset + 4;
    const eB = offset + 5;
    const eL = offset + 6;
    const fM = offset + 7;
    const fL = offset + 8;
    const fT = offset + 9;
    const gM = offset + 10;
    const gT = offset + 11;
    const gR = offset + 12;
    const hM = offset + 13;
    const hR = offset + 14;
    const hB = offset + 15;

    // Update quads
    targetQuad[0] = eM;
    targetQuad[1] = fM;
    targetQuad[2] = gM;
    targetQuad[3] = hM;
    const qL: Quad = [aL, bL, fL, eL];
    const qT: Quad = [fT, bT, cT, gT];
    const qR: Quad = [hR, gR, cR, dR];
    const qB: Quad = [aB, eB, hB, dB];
    quads.push(qL);
    quads.push(qT);
    quads.push(qR);
    quads.push(qB);

    // Update positions
    positions[aB] = vec3.clone(positionA);
    positions[aL] = positionA;
    positions[bL] = positionB;
    positions[bT] = vec3.clone(positionB);
    positions[cT] = vec3.clone(positionC);
    positions[cR] = positionC;
    positions[dR] = positionD;
    positions[dB] = vec3.clone(positionD);
    positions[eM] = positionE;
    positions[eB] = vec3.clone(positionE);
    positions[eL] = vec3.clone(positionE);
    positions[fM] = positionF;
    positions[fL] = vec3.clone(positionF);
    positions[fT] = vec3.clone(positionF);
    positions[gM] = positionG;
    positions[gT] = vec3.clone(positionG);
    positions[gR] = vec3.clone(positionG);
    positions[hM] = positionH;
    positions[hR] = vec3.clone(positionH);
    positions[hB] = vec3.clone(positionH);

    // Normals - assume that disjoint mesh all share the same normal.
    if (normals) {
      const normal = normals[a];
      normals[aB] = vec3.clone(normal);
      normals[aL] = normals[a];
      normals[bL] = normals[b];
      normals[bT] = vec3.clone(normal);
      normals[cT] = vec3.clone(normal);
      normals[cR] = normals[c];
      normals[dR] = normals[d];
      normals[dB] = vec3.clone(normal);
      normals[eM] = vec3.clone(normal);
      normals[eB] = vec3.clone(normal);
      normals[eL] = vec3.clone(normal);
      normals[fM] = vec3.clone(normal);
      normals[fL] = vec3.clone(normal);
      normals[fT] = vec3.clone(normal);
      normals[gM] = vec3.clone(normal);
      normals[gT] = vec3.clone(normal);
      normals[gR] = vec3.clone(normal);
      normals[hM] = vec3.clone(normal);
      normals[hR] = vec3.clone(normal);
      normals[hB] = vec3.clone(normal);
    }

    return [qL, qT, qR, qB, targetQuad];
  };
})();

/**
 * Given a target quad, first inset it, then move it along the quad's normal
 * outwards by a given distance, but all new geometry generated will not
 * share positions.
 */
export const extrudeDisjoint = (() => {
  const toTranslate: Index[] = [];
  const translation: Tuple3 = [0, 0, 0];
  return function(mesh: QuadMesh, targetQuad: Quad, insetT = 0, extrude = 0) {
    const { positions, normals } = mesh;
    const ring = insetDisjoint(mesh, targetQuad, insetT);
    const [qL, qT, qR, qB] = ring;

    // Enumerate which positions to translate
    toTranslate[0] = targetQuad[0];
    toTranslate[1] = targetQuad[1];
    toTranslate[2] = targetQuad[2];
    toTranslate[3] = targetQuad[3];

    toTranslate[4] = qL[2];
    toTranslate[5] = qL[3];

    toTranslate[6] = qT[0];
    toTranslate[7] = qT[3];

    toTranslate[8] = qR[0];
    toTranslate[9] = qR[1];

    toTranslate[10] = qB[1];
    toTranslate[11] = qB[2];

    if (!normals) {
      throw new Error("The extrude command needs a normal");
    }
    // Assume that disjoint quads all share the same normal.
    const targetQuadNormal = normals[targetQuad[0]];
    vec3.scale(translation, targetQuadNormal, extrude);

    for (let i = 0; i < toTranslate.length; i++) {
      const position = positions[toTranslate[i]];
      vec3.add(position, position, translation);
    }

    // Calculate the normals for the translated rings.
    for (let i = 0; i < ring.length; i++) {
      updateNormalsForQuad(mesh, ring[i]);
    }
  };
})();

/**
 * Computes the center of a quad.
 */
export function getCenter(mesh: QuadMesh, quad: Quad | QuadIndex, target: Tuple3 = [0, 0, 0]): Tuple3 {
  quad = getQuad(mesh, quad);
  const a = mesh.positions[quad[0]];
  const b = mesh.positions[quad[1]];
  const c = mesh.positions[quad[2]];
  const d = mesh.positions[quad[3]];
  target[0] = (a[0] + b[0] + c[0] + d[0]) * 0.25;
  target[1] = (a[1] + b[1] + c[1] + d[1]) * 0.25;
  target[2] = (a[2] + b[2] + c[2] + d[2]) * 0.25;
  return target;
}

/**
 * Clones a quad. Returns the new quad.
 */
export function clone(mesh: QuadMesh, quad: Quad): Quad {
  const index = mesh.positions.length;
  const clonedQuad: Quad = [index, index + 1, index + 2, index + 3];
  const { quads, positions, normals } = mesh;
  quads.push(clonedQuad);
  positions.push(vec3.clone(positions[quad[0]]));
  positions.push(vec3.clone(positions[quad[1]]));
  positions.push(vec3.clone(positions[quad[2]]));
  positions.push(vec3.clone(positions[quad[3]]));
  if (normals) {
    normals.push(vec3.clone(normals[quad[0]]));
    normals.push(vec3.clone(normals[quad[1]]));
    normals.push(vec3.clone(normals[quad[2]]));
    normals.push(vec3.clone(normals[quad[3]]));
  }
  return clonedQuad;
}

/**
 * Clones a group of quads and their geometry. Use getNewGeometry to capture the newly
 * created geometry.
 */
export function cloneQuads(mesh: QuadMesh, quads: Quad[]): void {
  // Get a list of the position indices used
  const positions = [];
  for (let i = 0; i < quads.length; i++) {
    const quad = quads[i];
    for (let j = 0; j < quad.length; j++) {
      const positionIndex = quad[j];
      positions[positionIndex] = positionIndex;
    }
  }
  const indices = positions.filter(i => i !== undefined);

  // Clone the quads.
  const quadIndexOffset = mesh.positions.length;
  const quadsLength = quads.length;
  for (let i = 0; i < quadsLength; i++) {
    const quad = quads[i];
    mesh.quads.push(
      quad.map(
        quadIndex => indices.indexOf(quadIndex) + quadIndexOffset
      ) as Tuple4
    );
  }

  // Clone the positions.
  for (let i = 0; i < indices.length; i++) {
    mesh.positions.push(vec3.clone(mesh.positions[indices[i]]));
  }

  const { normals } = mesh;
  if (normals) {
    // Clone the normals.
    for (let i = 0; i < indices.length; i++) {
      normals.push(vec3.clone(normals[indices[i]]));
    }
  }
}

/**
 * Updates all of the normals for all the positions using
 * {@link #averageNormalForPosition}. If a normal doesn't exist,
 * then it is created.
 */
export function updateNormalsForQuad(mesh: QuadMesh, quad: Quad) {
  const { normals } = mesh;
  if (normals) {
    const normal = normals[quad[0]];
    getQuadNormal(mesh, quad, normal);
    vec3.copy(normals[quad[1]], normal);
    vec3.copy(normals[quad[2]], normal);
    vec3.copy(normals[quad[3]], normal);
  }
}

// eslint-disable-next-line no-var
/**
 * Compute a quad's normal regardless of it's neighboring quads.
 */
export var getQuadNormal = (() => {
  const edgeA: Tuple3 = [0, 0, 0];
  const edgeB: Tuple3 = [0, 0, 0];
  return function getQuadNormal(
    mesh: QuadMesh,
    quad: Quad,
    target: Tuple3 = [0, 0, 0]
  ): Tuple3 {
    const positionA = mesh.positions[quad[0]];
    const positionB = mesh.positions[quad[1]];
    const positionC = mesh.positions[quad[2]];
    vec3.subtract(edgeA, positionB, positionA);
    vec3.subtract(edgeB, positionC, positionB);
    vec3.normalize(target, vec3.cross(target, edgeA, edgeB));
    return target;
  };
})();

/**
 * Update a quad's normal in the mesh.
 */
function updateQuadNormal(mesh: QuadMesh, quad: Quad): void {
  const {normals} = mesh;
  if (normals) {
    const [a, b, c, d] = quad;
    const normal: Tuple3 = normals[a] || [0, 0, 0]
    getQuadNormal(mesh, quad, normal);
    normals[a] = normal;
    normals[b] = vec3.copy(normals[b] || [0, 0, 0], normal)
    normals[c] = vec3.copy(normals[c] || [0, 0, 0], normal)
    normals[d] = vec3.copy(normals[d] || [0, 0, 0], normal)
  }
}

/**
 * Given a position index, find any quads that include it.
 */
export function getQuadsFromPositionIndex(
  mesh: QuadMesh,
  index: number,
  target: Quad[] = []
) {
  for (let i = 0; i < mesh.quads.length; i++) {
    const quad = mesh.quads[i];
    if (quad.indexOf(index) >= 0) {
      target.push(quad);
    }
  }
  return target;
}

/**
 * Flip a quad's normal to point the other way. Returns the quad.
 */
export function flip(mesh: QuadMesh, quad: Quad): void {
  quad.reverse();
  const { normals } = mesh;
  if (normals) {
    const [a, b, c, d] = quad;
    const nA = normals[a];
    const nB = normals[b];
    const nC = normals[c];
    const nD = normals[d];

    vec3.scale(nA, nA, -1);
    vec3.scale(nB, nB, -1);
    vec3.scale(nC, nC, -1);
    vec3.scale(nD, nD, -1);
  }
}

type Facing = "x+" | "x-" | "y+" | "y-" | "z+" | "z-";

type QuadOptions =
  | { positions: [Tuple3, Tuple3, Tuple3, Tuple3] }
  | { w: number; h: number; facing?: Facing };

/**
 * Create a quad with options. If the optionalMesh object is passed, then the
 * quad will be created inside of that simplicial complex, otherwise a new
 * mesh simplicial complex will be generated. Both the mesh simplicial
 * complex and the created quad are returned in an object.
 */
export function createQuad(
  options?: QuadOptions,
  mesh?: QuadMesh
): { mesh: QuadMesh; quad: Quad } {
  if (!mesh) {
    mesh = {
      positions: [],
      normals: [],
      quads: [],
    };
  }
  const { positions, normals, quads } = mesh;

  const index = positions.length;
  let direction;
  const quad: Tuple4 = [index, index + 1, index + 2, index + 3];
  quads.push(quad);
  if (options && "positions" in options) {
    positions.push(options.positions[0]);
    positions.push(options.positions[1]);
    positions.push(options.positions[2]);
    positions.push(options.positions[3]);
  } else {
    let w, h;
    if (options && options.w && options.h) {
      w = options.w / 2;
      h = options.h / 2;
    } else {
      w = 0.5;
      h = 0.5;
    }
    const facing = options && options.facing ? options.facing : "y+";
    const axis = facing[0];
    direction = facing[1];
    switch (axis) {
      case "x":
        positions.push([0, -w, -h]);
        positions.push([0, w, -h]);
        positions.push([0, w, h]);
        positions.push([0, -w, h]);
        break;
      case "y":
        positions.push([-w, 0, -h]);
        positions.push([-w, 0, h]);
        positions.push([w, 0, h]);
        positions.push([w, 0, -h]);
        break;
      case "z":
        positions.push([-w, -h, 0]);
        positions.push([-w, h, 0]);
        positions.push([w, h, 0]);
        positions.push([w, -h, 0]);
        break;
      default:
        throw new Error("Unknown Facing type");
    }
  }
  const normal = getQuadNormal(mesh, quad);
  if (normals) {
    normals.push(normal);
    normals.push(vec3.clone(normal));
    normals.push(vec3.clone(normal));
    normals.push(vec3.clone(normal));
  }

  if (direction === "-") {
    flip(mesh, quad);
  }

  return { mesh, quad };
}

/**
 * Creates a quad box of the given dimensions, but with non-joined positions.
 * This box renders as a flat shaded box. If the optionalMesh object is
 * passed, then the box will be created inside of that simplicial complex,
 * otherwise a new mesh simplicial complex will be generated.
 */
export function createBoxDisjoint(
  x = 1,
  y = 1,
  z = 1,
  optionalMesh?: QuadMesh
) {
  const { mesh, quad } = createQuad({ w: x, h: z }, optionalMesh);
  for (let i = mesh.positions.length - 4; i < mesh.positions.length; i++) {
    mesh.positions[i][1] -= y / 2;
  }
  clone(mesh, quad);
  flip(mesh, mesh.quads[mesh.quads.length - 1]);
  extrudeDisjoint(mesh, quad, 0, y);
  return mesh;
}

/**
 * Creates a quad box of the given dimensions. This box will render as a
 * smoothed out box, as the normals are averaged. This is typically used for a
 * starting place for subdividing or extrusion operations. If the
 * `optionalMesh` object is passed, then the box will be created inside of
 * that simplicial complex, otherwise a new mesh simplicial complex will be
 * generated.
 */
export function createBox(
  x: number,
  y: number,
  z: number,
  optionalMesh?: QuadMesh
): QuadMesh {
  return mergePositions(createBoxDisjoint(x, y, z, optionalMesh));
}

/**
 * Combine all positions together and recompute the normals.
 */
export function mergePositions(mesh: QuadMesh): QuadMesh {
  const { positions, normals, quads } = mesh;
  // Go through each position.
  for (let aIndex = 0; aIndex < positions.length; aIndex++) {
    const a = positions[aIndex];

    // Compare this position to the rest of the position.
    for (let bIndex = aIndex + 1; bIndex < positions.length; bIndex++) {
      const b = positions[bIndex];

      // If the positions match, then remove "a" from positions.
      if (a[0] === b[0] && a[1] === b[1] && a[2] === b[2]) {
        // Update the quads to point to the bIndex.
        for (let k = 0; k < quads.length; k++) {
          const quad = quads[k];
          for (let l = 0; l < quad.length; l++) {
            const index = quad[l];
            if (index === aIndex) {
              quad[l] = bIndex - 1;
            } else if (index > aIndex) {
              quad[l]--;
            }
          }
        }

        // Remove the position and continue
        positions.splice(aIndex, 1);
        if (normals) {
          normals.splice(aIndex, 1);
        }
        aIndex--;
        break;
      }
    }
  }

  if (normals) {
    const normalCache = new Map();
    for (let i = 0; i < positions.length; i++) {
      averageNormalForPosition(mesh, i, normals[i], normalCache);
    }
  }
  return mesh;
}
/**
 * Returns an elements array using the given `ArrayType`, which can be used by WebGL.
 */
export function getElements(
  mesh: QuadMesh,
  drawMode = "triangles",
  ArrayType = Uint16Array
): Uint16Array {
  const countPerQuad = drawMode === "lines" ? 8 : 6;
  const elements = new ArrayType(mesh.quads.length * countPerQuad);

  if (drawMode === "lines") {
    // lines
    for (let i = 0; i < mesh.quads.length; i++) {
      const [a, b, c, d] = mesh.quads[i];
      const offset = i * countPerQuad;
      // Lines
      elements[offset + 0] = a;
      elements[offset + 1] = b;

      elements[offset + 2] = b;
      elements[offset + 3] = c;

      elements[offset + 4] = c;
      elements[offset + 5] = d;

      elements[offset + 6] = d;
      elements[offset + 7] = a;
    }
  } else {
    for (let i = 0; i < mesh.quads.length; i++) {
      const offset = i * countPerQuad;
      const [a, b, c, d] = mesh.quads[i];
      // Triangle:
      elements[offset + 0] = a;
      elements[offset + 1] = b;
      elements[offset + 2] = c;

      elements[offset + 3] = c;
      elements[offset + 4] = d;
      elements[offset + 5] = a;
    }
  }
  return elements;
}

/**
 * Updates all of the normals for all the positions using
 * `averageNormalForPosition`. If a normal doesn't exist, then it is created.
 */
export function computeSmoothNormals(mesh: QuadMesh): QuadMeshNormals {
  if (!mesh.normals) {
    mesh.normals = [];
  }
  const normalCache = new Map();
  const positionIndexToQuads = _calculatePositionIndexToQuads(mesh);
  for (let i = 0; i < mesh.positions.length; i++) {
    let normal = mesh.normals[i];
    if (!normal) {
      normal = [0, 0, 0];
      mesh.normals[i] = normal;
    }
    averageNormalForPosition(
      mesh,
      i,
      normal,
      normalCache,
      positionIndexToQuads
    );
  }
  return mesh as QuadMeshNormals;
}

/**
 * Given a quad, walk along the mesh in both directions and split the quad.
 *
 * ```
 * *--------*--------*--------*--------*--------*--------*--------*
 * |        |        |        |        |        |        |        |
 * *     <--*--------*--------*--quad--*--------*--------*-->     *
 * |        |        |        |        |        |        |        |
 * *--------*--------*--------*--------*--------*--------*--------*
 * ```
 */
export function splitLoopHorizontal(mesh: QuadMesh, quad: Quad | QuadIndex, t = 0.5): void {
  splitLoop(mesh, quad, t, true);
}

/**
 * Given a quad, walk along the mesh in both directions and split the quad.
 *
 * ```
 * *---------*
 * |    ^    |
 * *----*----*
 * |    |    |
 * *----|----*
 * |  quad   |
 * *----|----*
 * |    |    |
 * *----*----*
 * |    V    |
 * *---------*
 * ```
 */
export function splitLoopVertical(mesh: QuadMesh, quad: Quad | QuadIndex, t = 0.5): void {
  splitLoop(mesh, quad, t);
}

function splitLoop(
  mesh: QuadMesh,
  quad: Quad | QuadIndex,
  t = 0.5,
  // Will walk in the opposite direction, e.g. up and down, versus left and right
  opposite?: boolean
): void {
  quad = getQuad(mesh, quad);
  let quadIndexA, quadIndexB, quadIndexC, quadIndexD;
  if (opposite) {
    quadIndexA = 1;
    quadIndexB = 2;
    quadIndexC = 3;
    quadIndexD = 0;
  } else {
    quadIndexA = 0;
    quadIndexB = 1;
    quadIndexC = 2;
    quadIndexD = 3;
  }

  const positionIndexLB = quad[quadIndexA];
  const positionIndexLT = quad[quadIndexB];
  const positionIndexMT = mesh.positions.length;
  const positionIndexMB = mesh.positions.length + 1;
  const positionIndexRT = quad[quadIndexC];
  const positionIndexRB = quad[quadIndexD];
  const { positions, quads, normals } = mesh;

  const positionA = vec3.lerp(
    [],
    positions[positionIndexLT],
    positions[positionIndexRT],
    t
  );
  const positionB = vec3.lerp(
    [],
    positions[positionIndexLB],
    positions[positionIndexRB],
    t
  );
  positions.push(positionA);
  positions.push(positionB);

  if (normals) {
    const normalA = vec3.lerp(
      [],
      normals[positionIndexLT],
      normals[positionIndexRT],
      t
    );
    const normalB = vec3.lerp(
      [],
      normals[positionIndexLB],
      normals[positionIndexRB],
      t
    );
    normals.push(vec3.normalize(normalA, normalA));
    normals.push(vec3.normalize(normalB, normalB));
  }
  // Split quads
  const quadL = quad;
  const quadR: Quad = [0, 0, 0, 0];
  quads.push(quadR);
  quadL[quadIndexC] = positionIndexMT;
  quadL[quadIndexD] = positionIndexMB;
  quadR[quadIndexA] = positionIndexMB;
  quadR[quadIndexB] = positionIndexMT;
  quadR[quadIndexC] = positionIndexRT;
  quadR[quadIndexD] = positionIndexRB;

  // Split by walking up and down from the quad, and then merge the last points if they
  // meet.
  const newPositionIndex = _walkAndSplitLoop(
    mesh,
    positionIndexLT,
    positionIndexMT,
    positionIndexRT,
    t
  );
  const didMerge =
    newPositionIndex === undefined
      ? false
      : _mergePositionsIfEqual(mesh, newPositionIndex, positionIndexMB);

  if (!didMerge) {
    _walkAndSplitLoop(
      mesh,
      positionIndexRB,
      positionIndexMB,
      positionIndexLB,
      1 - t
    );
  }
}

function _mergePositionsIfEqual(
  mesh: QuadMesh,
  positionIndexA: PositionIndex,
  positionIndexB: PositionIndex
): boolean {
  const { positions, normals, quads } = mesh;
  if (positionIndexA >= 0 && positionIndexB >= 0) {
    const positionA = positions[positionIndexA];
    const positionB = positions[positionIndexB];
    if (
      positionA[0] === positionB[0] &&
      positionA[1] === positionB[1] &&
      positionA[2] === positionB[2]
    ) {
      const positionIndexSaved =
        positionIndexA < positionIndexB ? positionIndexA : positionIndexB;
      const positionIndexDeleted =
        positionIndexA > positionIndexB ? positionIndexA : positionIndexB;

      // Update the quads.
      for (let k = 0; k < quads.length; k++) {
        const quad = quads[k];
        for (let l = 0; l < quad.length; l++) {
          const positionIndex = quad[l];
          if (positionIndex === positionIndexDeleted) {
            quad[l] = positionIndexSaved;
          } else if (positionIndex > positionIndexDeleted) {
            quad[l] = positionIndex - 1;
          }
        }
      }

      // Remove the position and continue
      positions.splice(positionIndexDeleted, 1);
      if (normals) {
        normals.splice(positionIndexDeleted, 1);
      }
      return true;
    }
  }
  return false;
}

/*
 * Utility function to split mesh in a loop in a single direction, based off of the
 * previously split quad's positions. The quad orientation is based off the previously
 * split quad.
 *
 *  LT----MT---RT
 *   |    .     |
 *   |    .     | <- split this quad
 *   |    .     |
 *  LB----MB---RB
 *   |    |     |
 *   |    |     | <- previous quad
 *   |    |     |
 *   *----*-----*
 */
function _walkAndSplitLoop(
  mesh: QuadMesh,
  positionIndexLB: PositionIndex,
  positionIndexMB: PositionIndex,
  positionIndexRB: PositionIndex,
  t: UnitInterval
) {
  let newPositionIndex;
  const { positions, normals, quads } = mesh;
  while (true) {
    const quad = getQuadFromEdge(mesh, positionIndexLB, positionIndexRB);
    if (!quad) {
      break;
    }
    const quadIndexA = quad.indexOf(positionIndexLB);
    const quadIndexD = quad.indexOf(positionIndexRB);
    const quadIndexB = (quadIndexA + 1) % 4;
    const quadIndexC = (quadIndexD + 3) % 4;

    const positionIndexLT = quad[quadIndexB];
    const positionIndexMT = mesh.positions.length;
    const positionIndexRT = quad[quadIndexC];

    // Create a new middle position at the opposite end
    const position = vec3.lerp(
      [],
      positions[positionIndexLT],
      positions[positionIndexRT],
      t
    );
    positions.push(position);

    if (normals) {
      const normal = vec3.lerp(
        [],
        normals[positionIndexLT],
        normals[positionIndexRT],
        t
      );
      vec3.normalize(normal, normal);
      normals.push(normal);
    }

    // Construct the split quads.
    const quadL = quad;
    const quadR: Quad = [0, 0, 0, 0];
    quads.push(quadR);

    quadL[quadIndexC] = positionIndexMT;
    quadL[quadIndexD] = positionIndexMB;

    quadR[quadIndexA] = positionIndexMB;
    quadR[quadIndexB] = positionIndexMT;
    quadR[quadIndexC] = positionIndexRT;
    quadR[quadIndexD] = positionIndexRB;

    // Modify the arguments to keep on walking.
    positionIndexLB = positionIndexLT;
    positionIndexMB = positionIndexMT;
    positionIndexRB = positionIndexRT;

    newPositionIndex = positionIndexMT;
  }
  return newPositionIndex;
}

/**
 * Find a quad given two position indices. Optionally provide a `ignoreQuad`
 * that will not be matched against. Returns the first quad that matches.
 */
export function getQuadFromEdge(
  mesh: QuadMesh,
  positionIndexA: PositionIndex,
  positionIndexB: PositionIndex,
  // A quad that will not be matched against.
  ignoreQuad?: Quad
): Quad | void {
  return mesh.quads.find(quad => {
    if (quad === ignoreQuad) {
      return false;
    }
    const quadIndexA = quad.indexOf(positionIndexA);
    if (quadIndexA >= 0) {
      if (
        quad[(quadIndexA + 1) % 4] === positionIndexB ||
        quad[(quadIndexA + 3) % 4] === positionIndexB
      ) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Get all newly created geometry of the given type from whatever arbitrary
 * operations were done on the mesh. This assumes new geometry was created
 * and not destroyed.
 *
 * Usage:
 *   const extrudedQuads = quad.getNewGeometry(mesh, "quads", () => {
 *     quad.extrude(mesh, tipQuad, 0.5, 3)
 *   });
 */
export function getNewGeometry<K extends keyof QuadMesh>(
  mesh: QuadMesh,
  key: K,
  callback: Function
): QuadMesh[K] {
  const geometry: QuadMesh[K] = mesh[key];
  if (!geometry) {
    throw new Error();
  }
  const start = geometry.length;
  callback();
  return geometry.slice(start, geometry.length) as QuadMesh[K];
}

/**
 * Computes all of the centers of all the quads.
 */
export function computeCenterPositions(mesh: QuadMesh): Tuple3[] {
  return mesh.quads.map(quad => computeQuadCenter(mesh, quad));
}

/**
 * Computes the center of a single quad.
 */
export function computeQuadCenter(
  mesh: QuadMesh,
  quad: Quad,
  target: Tuple3 = [0, 0, 0]
): Tuple3 {
  const [aI, bI, cI, dI] = quad;
  const { positions } = mesh;
  const a = positions[aI];
  const b = positions[bI];
  const c = positions[cI];
  const d = positions[dI];
  target[0] = (a[0] + b[0] + c[0] + d[0]) * 0.25;
  target[1] = (a[1] + b[1] + c[1] + d[1]) * 0.25;
  target[2] = (a[2] + b[2] + c[2] + d[2]) * 0.25;
  return target;
}

/**
 * Given a quad, walk a loop and inset the loop, where 0 is the inset being on
 * the edge, and 1 the inset being in the end.
 *
 * ```
 * *----------------*
 * |  ^          ^  |
 * *--*----------*--*
 * |  |          |  |
 * *--|----------|--*
 * |  |   quad   |  |
 * *--|----------|--*
 * |  |          |  |
 * *--*----------*--*
 * |  V          V  |
 * *----------------*
 * ```
 */
export function insetLoopVertical(mesh: QuadMesh, quad: Quad | QuadIndex, t = 0.5): void {
  insetLoop(mesh, quad, t, false);
}

/**
 * Given a quad, walk a loop and inset the loop, where 0 is the inset being on
 * the edge, and 1 the inset being in the end.
 *
 * ```
 * *----*----*----*----*----*----*----*----*----*
 * |    |    |    |    |    |    |    |    |    |
 * |    |    |<---|----|----|----|--->|    |    |
 * |    |    |    |    |quad|    |    |    |    |
 * |    |    |<---|----|----|----|--->|    |    |
 * |    |    |    |    |    |    |    |    |    |
 * *----*----*----*----*----*----*----*----*----*
 * ```
 */
export function insetLoopHorizontal(mesh: QuadMesh, quad: Quad | QuadIndex, t = 0.5): void {
  insetLoop(mesh, quad, t, true);
}

function insetLoop(
  mesh: QuadMesh,
  quad: Quad | QuadIndex,
  t: number,
  // Will walk in the opposite direction, e.g. up and down, versus left and right
  opposite: boolean
): void {
  if (t < 0 || t > 1) {
    throw new Error("t was out of range: " + t);
  }
  const tA = 1 - 0.5 * t;
  const tB = (t * 0.5) / tA;
  splitLoop(mesh, quad, tA, opposite);
  splitLoop(mesh, quad, tB, opposite);
}

/**
 * Gets a loop of quads. Given a single quad, start walking in both
 * directions to select a loop. .
 */
export function getLoopVertical<K extends "positions" | "normals" | "quads">(
  mesh: QuadMesh,
  quad: Quad | QuadIndex,
  type: K
): QuadMesh[K] {
  return getLoop(mesh, quad, type, false);
}

/**
 * Gets a loop of quads. Given a single quad, start walking in both
 * directions to select a loop. .
 */
export function getLoopHorizontal<K extends "positions" | "normals" | "quads">(
  mesh: QuadMesh,
  quad: Quad | QuadIndex,
  type: K
): QuadMesh[K] {
  return getLoop(mesh, quad, type, true);
}

function getLoop<K extends "positions" | "normals" | "quads">(
  mesh: QuadMesh,
  quad: Quad | QuadIndex,
  type: K,
  // Will walk in the opposite direction, e.g. up and down, versus left and right
  opposite: boolean
): QuadMeshNormals[K] {
  quad = getQuad(mesh, quad);
  if (type === "quads") {
    const quads: Quad[] = _getLoopQuads(mesh, quad, opposite);
    return quads as any;
  }
  if (type === "normals" && !mesh.normals) {
    computeSmoothNormals(mesh);
  }
  const mesh2 = mesh as QuadMeshNormals;

  let positionIndexALB, positionIndexARB, positionIndexBLB, positionIndexBRB;
  if (opposite) {
    positionIndexALB = quad[0];
    positionIndexARB = quad[1];
    positionIndexBLB = quad[2];
    positionIndexBRB = quad[3];
  } else {
    positionIndexALB = quad[1];
    positionIndexARB = quad[2];
    positionIndexBLB = quad[3];
    positionIndexBRB = quad[0];
  }

  return [
    ..._getLoopOneDirection(
      mesh2,
      quad,
      type,
      positionIndexALB,
      positionIndexARB
    ),
    ...quad.map(i => mesh2[type][i]),
    ..._getLoopOneDirection(
      mesh2,
      quad,
      type,
      positionIndexBLB,
      positionIndexBRB
    ),
  ] as QuadMeshNormals[K];
}

function _getLoopQuads(mesh: QuadMesh, quad: Quad, opposite?: boolean): Quad[] {
  let positionIndexLB, positionIndexRB;
  if (opposite) {
    positionIndexLB = quad[1];
    positionIndexRB = quad[2];
  } else {
    positionIndexLB = quad[0];
    positionIndexRB = quad[1];
  }

  return [
    ..._getLoopQuadssOneDirection(mesh, quad, positionIndexLB, positionIndexRB),
    quad,
    ..._getLoopQuadssOneDirection(
      mesh,
      quad,
      positionIndexRB,
      positionIndexLB
    ).reverse(),
  ];
}

function _getLoopQuadssOneDirection(
  mesh: QuadMesh,
  quad: Quad,
  indexA: PositionIndex,
  indexB: PositionIndex
): Quad[] {
  const loop = [];
  let positionIndexLB = indexA;
  let positionIndexRB = indexB;
  let neighborQuad: Quad | void = quad;
  while (true) {
    neighborQuad = getQuadFromEdge(
      mesh,
      positionIndexLB,
      positionIndexRB,
      neighborQuad
    );
    if (!neighborQuad || neighborQuad === quad) {
      break;
    }

    loop.push(neighborQuad);

    const quadIndexA = neighborQuad.indexOf(positionIndexLB);
    const quadIndexD = neighborQuad.indexOf(positionIndexRB);
    const quadIndexB = (quadIndexA + 1) % 4;
    const quadIndexC = (quadIndexD + 3) % 4;

    // Modify the arguments to keep on walking.
    positionIndexLB = neighborQuad[quadIndexB];
    positionIndexRB = neighborQuad[quadIndexC];
  }
  return loop;
}

function _getLoopOneDirection<K extends "positions" | "normals" | "quads">(
  mesh: QuadMeshNormals,
  quad: Quad,
  type: K,
  indexA: PositionIndex,
  indexB: PositionIndex
): QuadMeshNormals[K] {
  const loop: QuadMeshNormals[K] = [];
  let positionIndexLB = indexA;
  let positionIndexRB = indexB;
  let neighborQuad: Quad | void = quad;
  while (true) {
    neighborQuad = getQuadFromEdge(
      mesh,
      positionIndexLB,
      positionIndexRB,
      neighborQuad
    );
    if (!neighborQuad || neighborQuad === quad) {
      break;
    }

    const quadIndexA = neighborQuad.indexOf(positionIndexLB);
    const quadIndexD = neighborQuad.indexOf(positionIndexRB);
    const quadIndexB = (quadIndexA + 1) % 4;
    const quadIndexC = (quadIndexD + 3) % 4;

    const meshProp: any = mesh[type];
    if (meshProp) {
      loop.push(meshProp[neighborQuad[quadIndexB]]);
      loop.push(meshProp[neighborQuad[quadIndexC]]);
    }

    // Modify the arguments to keep on walking.
    positionIndexLB = neighborQuad[quadIndexB];
    positionIndexRB = neighborQuad[quadIndexC];
  }
  return loop;
}

/**
 * Clone all existing geometry, and mirror it about the given axis.
 */
export function mirror(mesh: QuadMesh, quads: Quad[], axis: "x" | "y" | "z") {
  const mirrorMap: { [key: number]: number } = {};
  let axisIndex: number;
  switch (axis) {
    case "x":
      axisIndex = 0;
      break;
    case "y":
      axisIndex = 1;
      break;
    case "z":
      axisIndex = 2;
      break;
    default:
      throw new UnhandledCaseError(axis, "Axis");
  }

  const { positions, normals } = mesh;
  quads.forEach(quad => {
    const mirrorQuad = quad.map(positionIndex => {
      let mirrorIndex = mirrorMap[positionIndex];
      if (mirrorIndex === undefined) {
        mirrorIndex = positions.length;
        mirrorMap[positionIndex] = mirrorIndex;

        const position = positions[positionIndex];
        const mirrorPosition = vec3.clone(position);
        mirrorPosition[axisIndex] *= -1;
        positions.push(mirrorPosition);

        if (normals) {
          const normal = normals[positionIndex];
          const mirrorNormal = vec3.clone(normal);
          mirrorNormal[axisIndex] *= -1;
          normals.push(mirrorNormal);
        }
      }
      return mirrorIndex;
    }) as Quad;
    mirrorQuad.reverse();
    mesh.quads.push(mirrorQuad);
  });

  return mesh;
}

/**
 * Apply catmull clark subdivision to a quad mesh.
 */
export function subdivide(mesh: QuadMesh, count: number): QuadMesh {
  let meshNew = mesh;
  for (let i = 0; i < count; i++) {
    meshNew = catmullClarkSubdivision(mesh);
    mesh.positions = meshNew.positions;
    mesh.quads = meshNew.quads;
  }
  computeSmoothNormals(mesh);
  return mesh;
}

function getQuad(
  mesh: QuadMesh,
  quad: Quad | QuadIndex,
): Quad {
  if (typeof quad === "number") {
    const quadIndex = quad;
    quad = mesh.quads[quadIndex];
    if (!quad) {
      throw new Error("Could not find quad at index " + quadIndex);
    }
  }
  return quad;
}

/**
 * Get a Tuple4 of the quads' positions with an optional target.
 */
export function getPositions(
  mesh: QuadMesh,
  quad: Quad | QuadIndex,
  target?: Array<any>
): Tuple4<Tuple3> {
  const [a, b, c, d] = getQuad(mesh, quad);
  if (!target) {
    target = [];
  }
  target[0] = ensureExists(mesh.positions[a]);
  target[1] = ensureExists(mesh.positions[b]);
  target[2] = ensureExists(mesh.positions[c]);
  target[3] = ensureExists(mesh.positions[d]);
  return target as Tuple4<Tuple3>;
}

/**
 * Get a Tuple4 of the quads' positions with an optional target.
 */
export function getPositionsSet(
  mesh: QuadMesh,
  ...quads: Array<Quad | QuadIndex>
): Set<Tuple3> {
  const positions: Set<Tuple3> = new Set();
  for (const q of quads) {
    for (const p of getPositions(mesh, getQuad(mesh, q))) {
      positions.add(p);
    }
  }
  return positions
}

export function tunnel(mesh: QuadMesh, quadA: Quad, quadB: Quad, t: number): Quad[] {
  const { positions, quads, normals } = mesh;
  let l = mesh.positions.length;
  inset(mesh, quadA, t);
  inset(mesh, quadB, t);
  if (mesh.positions.length - l !== 8) {
    throw new Error("Expected 8 new points made by the inset operation.")
  }
  const positionIndexesA = [l + 0, l + 1, l + 2, l + 3];
  const positionIndexesB = [l + 4, l + 5, l + 6, l + 7];
  const neighbors = positionIndexesA.map(positionIndexA => {
    let closest = null;
    let closestDistSq = 0;
    const positionA = mesh.positions[positionIndexA];
    for (let i = 0; i < 4; i++) {
      const positionIndexB = positionIndexesB[i];
      const positionB = mesh.positions[positionIndexB];
      const distSq = vec3.sqrDist(positionA, positionB)
      if (closest === null || distSq < closestDistSq) {
        closest = positionIndexB;
        closestDistSq = distSq
      }
    }
    return closest as number;
  });
  const quadC: Quad = [0, 0, 0, 0];
  const quadD: Quad = [0, 0, 0, 0];
  mesh.quads.push(quadC, quadD);
  const newQuads: Quad[] = [
    quadA,
    quadB,
    quadC,
    quadD,
  ]
  for (let i = 0; i < 4; i++) {
    const quad = newQuads[i]
    quad[0] = positionIndexesA[i]
    quad[1] = positionIndexesA[(i+1) % 4]
    quad[2] = neighbors[(i+1) % 4]
    quad[3] = neighbors[i]
    if (normals) {
      updateQuadNormal(mesh, quad);
    }
  }
  return newQuads;
}

/**
 * Computes the center of some geometry.
 */
export function getPositionsCenter(positions: Array<Tuple3> | Set<Tuple3>, target: Tuple3 = [0,0,0]) {
  target[0] = 0
  target[1] = 0
  target[2] = 0
  for (const [x, y, z] of positions) {
    target[0] += x
    target[1] += y
    target[2] += z
  }
  const len = Array.isArray(positions) ? positions.length : positions.size;
  target[0] /= len;
  target[1] /= len;
  target[2] /= len;

  return target;
}

const _center: Tuple3 = [0, 0, 0]
export function centeredPositionsTransform(
  positions: Array<Tuple3> | Set<Tuple3>,
  fn: (position:Tuple3) => void
): void {
  const [x, y, z] = getPositionsCenter(positions, _center);
  for (const p of positions) {
    p[0] -= x
    p[1] -= y
    p[2] -= z
    fn(p)
    p[0] += x
    p[1] += y
    p[2] += z
  }
}

export function centeredTransform(
  mesh: QuadMesh,
  quads: Array<QuadIndex | Quad> | Set<QuadIndex | Quad>,
  fn: (position:Tuple3) => void
): void {
  const positions = new Set<Tuple3>();
  for (const quad of quads) {
    for (const p of getPositions(mesh, quad)) {
      positions.add(p);
    }
  }
  return centeredPositionsTransform(positions, fn);
}
