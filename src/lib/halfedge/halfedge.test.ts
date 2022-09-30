import { assertArt } from "lib/quads/tests/helpers";
import { Face, HalfEdge, HEMesh } from "lib/halfedge";

describe("HEMesh", () => {
  it("creates a mesh", () => {
    const mesh = new HEMesh();
    mesh.createFace([-2, -2, 0], [2, -2, 0], [-2, 2, 0]);
    mesh.createFace([4, 0, 0], [4, 4, 0], [0, 4, 0]);

    assertArt(
      mesh,
      "z",
      `
      │    -5 -4 -3 -2 -1  0  1  2  3  4  5
      │ -5  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      │ -4  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      │ -3  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      │ -2  ·  ·  ·  ◆━━━━━━━━━━╱◆  ·  ·  ·
      │ -1  ·  ·  ·  ┃  ·  ┊ ╱╱╱ ·  ·  ·  ·
      │  0 ┈┈┈┈┈┈┈┈┈┈┃┈┈┈┈╱╱╱┈┈┈┈┈┈┈┈┈╱◆┈┈┈┈
      │  1  ·  ·  ·  ┃ ╱╱╱ ┊  ·  · ╱╱╱ ┃  ·
      │  2  ·  ·  ·  ◆╱ ·  ┊  · ╱╱╱ ·  ┃  ·
      │  3  ·  ·  ·  ·  ·  ┊ ╱╱╱ ·  ·  ┃  ·
      │  4  ·  ·  ·  ·  ·  ◆╱━━━━━━━━━━◆  ·
      │  5  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      `
    );

    expect(isFullyConnected(mesh)).toBe(false);

    validateMesh(mesh);
  });

  it("can add a face", () => {
    const mesh = new HEMesh();
    const face = mesh.createFace([-2, -2, 0], [2, -2, 0], [-2, 2, 0]);
    face.edge.next.addFace([2, 2, 0]);
    assertArt(
      mesh,
      "z",
      `
      │    -5 -4 -3 -2 -1  0  1  2  3  4  5
      │ -5  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      │ -4  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      │ -3  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      │ -2  ·  ·  ·  ◆━━━━━━━━━━╱◆  ·  ·  ·
      │ -1  ·  ·  ·  ┃  ·  ┊ ╱╱╱ ┃  ·  ·  ·
      │  0 ┈┈┈┈┈┈┈┈┈┈┃┈┈┈┈╱╱╱┈┈┈┈┃┈┈┈┈┈┈┈┈┈┈
      │  1  ·  ·  ·  ┃ ╱╱╱ ┊  ·  ┃  ·  ·  ·
      │  2  ·  ·  ·  ◆━━━━━━━━━━━◆  ·  ·  ·
      │  3  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      │  4  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      │  5  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      `
    );

    expect(isFullyConnected(mesh)).toBe(true);
    validateMesh(mesh);
  });

  it("can flip an edge", () => {
    const mesh = new HEMesh();
    const face = mesh.createFace([2, -2, 0], [-2, -2, 0], [-2, 2, 0]);
    const diagonalEdge = face.edge.next.next;
    diagonalEdge.addFace([2, 2, 0]);

    assertArt(
      mesh,
      "z",
      `
      │    -5 -4 -3 -2 -1  0  1  2  3  4  5
      │ -5  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      │ -4  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      │ -3  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      │ -2  ·  ·  ·  ◆━━━━━━━━━━╱◆  ·  ·  ·
      │ -1  ·  ·  ·  ┃  ·  ┊ ╱╱╱ ┃  ·  ·  ·
      │  0 ┈┈┈┈┈┈┈┈┈┈┃┈┈┈┈╱╱╱┈┈┈┈┃┈┈┈┈┈┈┈┈┈┈
      │  1  ·  ·  ·  ┃ ╱╱╱ ┊  ·  ┃  ·  ·  ·
      │  2  ·  ·  ·  ◆━━━━━━━━━━━◆  ·  ·  ·
      │  3  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      │  4  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      │  5  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      `
    );

    diagonalEdge.flip();
    validateMesh(mesh);
    expect(isFullyConnected(mesh)).toBe(true);

    assertArt(
      mesh,
      "z",
      `
      │    -5 -4 -3 -2 -1  0  1  2  3  4  5
      │ -5  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      │ -4  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      │ -3  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      │ -2  ·  ·  ·  ◆━━━━━━━━━━━◆  ·  ·  ·
      │ -1  ·  ·  ·  ┃ ╲╲╲ ┊  ·  ┃  ·  ·  ·
      │  0 ┈┈┈┈┈┈┈┈┈┈┃┈┈┈┈╲╲╲┈┈┈┈┃┈┈┈┈┈┈┈┈┈┈
      │  1  ·  ·  ·  ┃  ·  ┊ ╲╲╲ ┃  ·  ·  ·
      │  2  ·  ·  ·  ◆━━━━━━━━━━╲◆  ·  ·  ·
      │  3  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      │  4  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      │  5  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      `
    );
  });
});

function validateTwins(edge: HalfEdge) {
  const { twin } = edge;
  if (!twin) {
    return;
  }
  expect(twin.twin).toEqual(edge);
  expect(edge.startPoint()).toEqual(twin.endPoint());
  expect(edge.endPoint()).toEqual(twin.startPoint());
}

function validateMesh(mesh: HEMesh) {
  const knownEdges = new Set();
  for (const face of mesh.faces) {
    const [eA, eB, eC] = face;
    expect(eA.face).toBe(face);
    expect(eB.face).toBe(face);
    expect(eC.face).toBe(face);
    expect(knownEdges.has(eA)).toBe(false);
    expect(knownEdges.has(eB)).toBe(false);
    expect(knownEdges.has(eC)).toBe(false);
    expect(eA.next.next.next).toEqual(eA);
    knownEdges.add(eA);
    knownEdges.add(eB);
    knownEdges.add(eC);
    validateTwins(eA);
    validateTwins(eB);
    validateTwins(eC);
  }
}

function isFullyConnected(mesh: HEMesh) {
  const face = mesh.faces[0];
  if (!face) {
    throw new Error("Expected at least one face.");
  }
  const faces = new Set();
  function recursiveFindFaces(face: Face) {
    if (faces.has(face)) {
      return;
    }
    faces.add(face);
    for (const edge of face) {
      if (edge.twin) {
        recursiveFindFaces(edge.twin.face);
      }
    }
  }
  recursiveFindFaces(face);
  return mesh.faces.length === faces.size;
}
