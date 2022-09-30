import { vec3 } from "lib/vec-math";

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
  point: Tuple3;
  face: Face;
  next!: HalfEdge;
  twin: HalfEdge | null = null;

  constructor(face: Face, point: Tuple3) {
    this.face = face;
    this.point = point;
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
    function setName(obj: any, name: string) {
      obj.name = name;
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

    const pA = eA.point;
    const pB = eB.point;
    const pC = eC.point;
    const pD = eD.point;

    eA.face = fB;
    eB.face = fA;
    eC.face = fA;
    eD.face = fB;

    this.face = fA;
    this.point = pD;
    this.next = eB;

    twin.face = fB;
    twin.point = pB;
    twin.next = eD;

    fA.edge = this;
    fB.edge = twin;

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

  addFace(point: Tuple3): Face {
    const face = new Face(
      this.mesh(),
      // Make sure the points are flipped
      this.endPoint(),
      this.startPoint(),
      point
    );
    this.setTwin(face.edge);
    this.mesh().faces.push(face);
    return face;
  }

  setTwin(edge: HalfEdge): void {
    this.twin = edge;
    edge.twin = this;
  }

  mesh(): HEMesh {
    return this.face.mesh;
  }

  startPoint(): Tuple3 {
    return this.point;
  }

  endPoint(): Tuple3 {
    return this.next.point;
  }

  oppositePoint(): Tuple3 {
    return this.next.next.point;
  }
}

export class Face {
  edge: HalfEdge;
  mesh: HEMesh;

  constructor(
    mesh: HEMesh,
    pA = vec3.create(),
    pB = vec3.create(),
    pC = vec3.create()
  ) {
    this.mesh = mesh;

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
}

export class HEMesh {
  faces: Face[] = [];

  createFace(a?: Tuple3, b?: Tuple3, c?: Tuple3): Face {
    const face = new Face(this, a, b, c);
    this.faces.push(face);
    return face;
  }
}
