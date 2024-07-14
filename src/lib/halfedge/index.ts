/* eslint-disable @typescript-eslint/no-unused-vars */
import { ensureExists } from "lib/utils";
import { vec3 } from "lib/vec-math";
type PointIndex = Index;
// type CellIndex = Index;
// type FaceIndex = Index;

class HalfEdgeIterator implements Iterator<HalfEdge> {
  start: HalfEdge;
  nextEdge: HalfEdge | null;
  constructor(edge: HalfEdge) {
    this.start = edge;
    this.nextEdge = null;
  }

  next() {
    const value = this.nextEdge ?? this.start;
    if (this.nextEdge === this.start) {
      return { value, done: true };
    }
    this.nextEdge = value.next;
    return { value, done: false };
  }
}

export class HalfEdge {
  pointIndex: PointIndex;
  face: Face;
  next!: HalfEdge;
  twin: HalfEdge | null = null;

  constructor(face: Face, pointIndex: PointIndex) {
    this.face = face;
    this.pointIndex = pointIndex;
  }

  prev(): HalfEdge {
    return this.next.next;
  }

  [Symbol.iterator](): HalfEdgeIterator {
    return new HalfEdgeIterator(this);
  }

  flip() {
    const twin = this.twin;
    if (!twin) {
      throw new Error("There was no twin to use for flipping.");
    }
    //                eA
    //  ·  ·  · pB ←━━━━━━━━ pA ·  ·  ·
    //  ·  ·  ·  ┃ fA  ┊ ↗/  ↑  ·  ·  ^
    // ┈|┈┈┈eB┈┈┈┃┈┈┈┈// ┈┈┈┈┃┈┈┈┈eD┈┈|┈
    //  v  ·  ·  ↓ /↙  ┊ fB  ┃  ·  ·  ·
    //  ·  ·  · pC ━━━━━━━━→ pD ·  ·  ·
    //                eC
    const eA = this.next;
    const eB = this.prev();
    const eC = twin.next;
    const eD = twin.prev();

    const fA = this.face;
    const fB = twin.face;

    // Everything commented out below is unchanged from the before state.

    // const pA = eA.point;
    const pB = eB.pointIndex;
    // const pC = eC.point
    const pD = eD.pointIndex;

    eA.face = fB;
    // eB.face = fA;
    eC.face = fA;
    // eD.face = fB;

    // this.face = fA;
    this.pointIndex = pD;
    this.next = eB;

    // twin.face = fB;
    twin.pointIndex = pB;
    twin.next = eD;

    fA.edge = this;
    // fB.edge = twin;

    eA.next = twin;
    eB.next = eC;
    eC.next = this;
    eD.next = eA;

    //                eA
    //  ·  ·  · pB ←━━━━━━━━ pA ·  ·  ·
    //  ·  ·  ·  ┃  ↖╲ ┊ fB  ↑  ·  ·  ·
    // ┈┈┈┈┈eB┈┈┈┃┈┈┈┈╲╲ ┈┈┈┈┃┈┈┈┈eD┈┈┈┈
    //  ·  ·  ·  ↓ fA  ┊╲↘   ┃  ·  ·  ·
    //  ·  ·  · pC ━━━━━━━━→ pD ·  ·  ·
    //                eC
  }

  /**
   * Adds a face to this edge given a new point.
   */
  addFace(point: PointIndex | Tuple3): Face {
    const face = new Face(
      this.mesh(),
      // Make sure the points are flipped
      this.endPointIndex(),
      this.startPointIndex(),
      this.mesh().toPointIndex(point)
    );
    this.connect(face.edge);
    this.mesh().faces.push(face);
    return face;
  }

  connect(edge: HalfEdge): void {
    this.twin = edge;
    edge.twin = this;
  }

  mesh(): HEMesh {
    return this.face.mesh;
  }

  startPointIndex(): PointIndex {
    return this.pointIndex;
  }

  endPointIndex(): PointIndex {
    return this.next.pointIndex;
  }

  oppositePointIndex(): PointIndex {
    return this.next.next.pointIndex;
  }

  startPoint(): Tuple3 {
    return this.face.mesh.points[this.pointIndex];
  }

  endPoint(): Tuple3 {
    return this.face.mesh.points[this.next.pointIndex];
  }

  oppositePoint(): Tuple3 {
    return this.face.mesh.points[this.next.next.pointIndex];
  }
}

export class Face {
  edge: HalfEdge;
  mesh: HEMesh;

  constructor(mesh: HEMesh, pA?: PointIndex, pB?: PointIndex, pC?: PointIndex) {
    this.mesh = mesh;

    if (pA === undefined) {
      pA = mesh.points.length;
      mesh.points.push(vec3.create());
    }
    if (pB === undefined) {
      pB = mesh.points.length;
      mesh.points.push(vec3.create());
    }
    if (pC === undefined) {
      pC = mesh.points.length;
      mesh.points.push(vec3.create());
    }

    const eA = new HalfEdge(this, pA);
    const eB = new HalfEdge(this, pB);
    const eC = new HalfEdge(this, pC);

    this.edge = eA;
    eA.next = eB;
    eB.next = eC;
    eC.next = eA;
  }

  [Symbol.iterator](): HalfEdgeIterator {
    return new HalfEdgeIterator(this.edge);
  }

  static #edgeA = vec3.create();
  static #edgeB = vec3.create();

  computeNormal(target: Tuple3 = vec3.create()): Tuple3 {
    const edgeA = Face.#edgeA;
    const edgeB = Face.#edgeB;
    const positionA = this.edge.startPoint();
    const positionB = this.edge.next.startPoint();
    const positionC = this.edge.next.next.startPoint();
    vec3.subtract(edgeA, positionB, positionA);
    vec3.subtract(edgeB, positionC, positionB);
    vec3.normalize(target, vec3.cross(target, edgeA, edgeB));
    return target;
  }

  /**
   * Connects
   */
  connect(other: Face): boolean {
    let connected = false;
    for (const edgeA of this) {
      for (const edgeB of other) {
        if (
          edgeA.startPointIndex() === edgeB.endPointIndex() &&
          edgeA.endPointIndex() === edgeB.startPointIndex()
        ) {
          connected = true;
          edgeA.twin = edgeB;
          edgeB.twin = edgeA;
        }
      }
    }
    return connected;
  }

  clone(): Face {
    return new Face(
      this.mesh,
      this.edge.pointIndex,
      this.edge.next.pointIndex,
      this.edge.next.next.pointIndex
    );
  }
}

export class HEMeshNormals {
  // TODO
}

export class HEMesh {
  faces: Face[] = [];
  points: Tuple3[] = [];
  normals?: Tuple3[];

  toPointIndex(value: Tuple3 | PointIndex | void): PointIndex {
    if (value === undefined) {
      value = vec3.create();
    }
    if (typeof value === "number") {
      return value;
    }
    const pointIndex = this.points.length;
    this.points.push(value);
    return pointIndex;
  }

  createFace(
    a?: Tuple3 | PointIndex,
    b?: Tuple3 | PointIndex,
    c?: Tuple3 | PointIndex
  ): Face {
    const face = new Face(
      this,
      this.toPointIndex(a),
      this.toPointIndex(b),
      this.toPointIndex(c)
    );
    this.faces.push(face);
    return face;
  }

  computeNormals() {
    if (!this.normals) {
      this.normals = [];
    }
    const normalCache = new Map();
    const pointIndexToFaces = this.#calculatePointIndexToFaces();
    for (let i = 0; i < this.points.length; i++) {
      let normal = this.normals[i];
      if (!normal) {
        normal = [0, 0, 0];
        this.normals[i] = normal;
      }
      this.#averageNormalForPoint(i, normal, normalCache, pointIndexToFaces);
    }
  }

  /**
   * Computes a normal for a point based on the average of the faces that use the point.
   */
  #averageNormalForPoint(
    pointIndex: Index,
    targetNormal: Tuple3 = vec3.create(),
    // A Map can be provided to cache intermediate normal computations.
    normalCache: Map<Face, Tuple3>,
    // A Map where positionIndex is mapped to its quad, used primarily internally.
    pointIndexToFaces: Map<PointIndex, Face[]>
  ) {
    const faces = ensureExists(pointIndexToFaces.get(pointIndex));
    vec3.set(targetNormal, 0, 0, 0);

    // Add neighboring quads' normals
    for (const face of faces) {
      let normal = normalCache.get(face);
      if (!normal) {
        normal = face.computeNormal();
        if (normalCache) {
          normalCache.set(face, normal);
        }
      }
      vec3.add(targetNormal, targetNormal, normal);
    }
    vec3.normalize(targetNormal, targetNormal);

    return targetNormal;
  }

  #calculatePointIndexToFaces(): Map<PointIndex, Face[]> {
    const toFace = new Map<PointIndex, Face[]>();
    for (let faceIndex = 0; faceIndex < this.faces.length; faceIndex++) {
      const face = this.faces[faceIndex];
      for (const edge of face) {
        let faces = toFace.get(edge.pointIndex);
        if (!faces) {
          faces = [];
          toFace.set(edge.pointIndex, faces);
        }
        faces.push(face);
      }
    }
    for (let i = 0; i < this.points.length; i++) {
      if (!toFace.has(i)) {
        // Guard against points that aren't attached to faces.
        toFace.set(i, []);
      }
    }
    return toFace;
  }

  static fromTriangleMesh(triMesh: TriangleMesh): HEMesh {
    const heMesh = new HEMesh();
    heMesh.points = triMesh.positions;
    if (triMesh.normals) {
      heMesh.normals = triMesh.normals;
    }

    for (let cellIndex = 0; cellIndex < triMesh.cells.length; cellIndex++) {
      const cell = triMesh.cells[cellIndex];
      heMesh.createFace(cell[0], cell[1], cell[2]);
    }

    // Build a map of points to faces.
    const pointToFaces = new Map<PointIndex, Face[]>();
    for (const face of heMesh.faces) {
      for (const edge of face) {
        const pointIndex = edge.startPointIndex();
        let faces = pointToFaces.get(pointIndex);
        if (!faces) {
          faces = [];
          pointToFaces.set(pointIndex, faces);
        }
        faces.push(face);
      }
    }

    for (const faces of pointToFaces.values()) {
      // Kind of a gross O(n^2) but hopefully it won't be slow. This could
      // be done through an edge lookup to not waste as many cycles.
      // See commit 795e808cdf00a28e3fda168ab08a6211c2ba8253.
      for (let i = 0; i < faces.length; i++) {
        for (let k = i + 1; k < faces.length; k++) {
          faces[i].connect(faces[k]);
        }
      }
    }

    return heMesh;
  }

  // TODO

  subdivide() {
    const createMidpoint = (edge: HalfEdge) => {
      const a = this.points[edge.startPointIndex()];
      const b = this.points[edge.endPointIndex()];

      const x = (a[0] + b[0]) / 2;
      const y = (a[1] + b[1]) / 2;
      const z = (a[2] + b[2]) / 2;

      midpoints.set(edge, this.points.length);
      this.points.push([x, y, z]);
      return this.points.length - 1;
    };

    const midpoints = new EdgeMap<PointIndex>(this.points.length);
    const startFaces = new Map<HalfEdge, Face>();
    const endFaces = new Map<HalfEdge, Face>();
    const midpointsVisited = new Set<PointIndex>();
    const facesLength = this.faces.length;

    for (let i = 0; i < facesLength; i++) {
      const face = this.faces[i];
      const ab = createMidpoint(face.edge);
      const bc = createMidpoint(face.edge.next);
      const ca = createMidpoint(face.edge.next.next);

      //           3
      //    a ---- ca ---- c
      //    | fA /  \ fC  /
      //    |  /    \   /
      // 1  ab ----- bc
      //    |  fB   /
      //    |    /       2
      //    |  /
      //    b

      const fA = face.clone();
      const fB = face.clone();
      const fC = face.clone();

      startFaces.set(face.edge, fA);
      endFaces.set(face.edge, fB);
      startFaces.set(face.edge.next, fB);
      endFaces.set(face.edge.next, fC);
      startFaces.set(face.edge.next.next, fC);
      endFaces.set(face.edge.next.next, fA);

      this.faces.push(fA, fB, fC);
    }
    // for (let i = 0; i < facesLength; i++) {
    //   const face = this.faces[i];
    //   const l = facesLength + i * 3
    //   const ab = this.faces[l];
    //   const bc = this.faces[l + 1];
    //   const ca = this.faces[l + 2];
    //   face.edge.pointIndex =
    //   face.edge.twin =
    // }

    const splitEdge = (edge: HalfEdge, faceA: Face, faceB: Face) => {
      //       twin?
      // <---------------*
      //         * m
      // *--------------->
      // a     edge      b
      const m = midpoints.get(edge)!;
      if (midpointsVisited.has(m)) {
        return;
      }
      midpointsVisited.add(m);

      const a = edge.startPointIndex();
      const b = edge.endPointIndex();

      const edgeFaceStart = startFaces.get(edge);
      const edgeFaceEnd = endFaces.get(edge);

      const { twin } = edge;
      if (twin) {
        const twinFaceStart = startFaces.get(twin);
        const twinFaceEnd = endFaces.get(twin);
      } else {
      }
    };

    for (let faceIndex = 0; faceIndex < facesLength; faceIndex++) {
      const face = this.faces[faceIndex];
      const fA = this.faces[facesLength + faceIndex * 3];
      const fB = this.faces[facesLength + faceIndex * 3 + 1];
      const fC = this.faces[facesLength + faceIndex * 3 + 2];

      // Split the edges.
      splitEdge(face.edge, fA, fB);
      splitEdge(face.edge.next, fB, fC);
      splitEdge(face.edge.next.next, fC, fA);

      //           3
      //    a ---- ac ---- c
      //    | fA /  \ fC  /
      //    |  /    \   /
      // 1  ab ----- bc
      //    |  fB   /
      //    |    /       2
      //    |  /
      //    b

      const a = face.edge.startPointIndex();
      const b = face.edge.next.startPointIndex();
      const c = face.edge.next.next.startPointIndex();

      const ab = getMidpoint(a, b);
      const bc = getMidpoint(b, c);
      const ca = getMidpoint(c, a);

      this.faces.push(new Face(this, a, ab, ca));
      this.faces.push(new Face(this, b, bc, ab));
      this.faces.push(new Face(this, c, ca, bc));
      this.faces.push(new Face(this, ab, bc, ca));
    }
  }
}

function getMidpoint(a: any, b: any): number {
  throw new Error("TODO");
}

class EdgeMap<T> {
  #map: Map<number, T> = new Map();
  #pointLength: number;

  /**
   * The maximum number of points used by the mesh.
   */
  constructor(maxPointLength: number) {
    this.#pointLength = maxPointLength;
  }

  getKey(edge: HalfEdge): number {
    let a = edge.startPointIndex();
    let b = edge.endPointIndex();
    if (b > a) {
      // Make sure the indexes are in a consistent order, so swap the values.
      // Swap the values.
      const a1 = a;
      const b1 = b;
      a = b1;
      b = a1;
    }
    return a + b * this.#pointLength;
  }

  set(key: HalfEdge, value: T) {
    return this.#map.set(this.getKey(key), value);
  }

  get(key: HalfEdge) {
    return this.#map.get(this.getKey(key));
  }

  has(key: HalfEdge) {
    return this.#map.has(this.getKey(key));
  }

  entries() {
    return this.#map.entries();
  }

  values() {
    return this.#map.values();
  }
}
