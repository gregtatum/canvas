import { findHoleEdges } from "../catmull-clark";

// TODO - Port image tests from ~/me/boru

describe("findHoleEdges", function() {
  it("can compute the holes for a clockwise quad", function() {
    // 1---2
    // |   |
    // 0---3
    const mesh: QuadMesh = {
      positions: [
        //
        [-1, -1, 0],
        [-1, 1, 0],
        [1, 1, 0],
        [1, -1, 0],
      ],
      quads: [[0, 1, 2, 3]],
    };
    expect([...findHoleEdges(mesh)]).toEqual([
      [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
      ],
    ]);
  });

  it("can compute the holes for a counter-clockwise quad", function() {
    // 2---1
    // |   |
    // 3---0
    const mesh: QuadMesh = {
      positions: [
        //
        [-1, -1, 0],
        [-1, 1, 0],
        [1, 1, 0],
        [1, -1, 0],
      ],
      quads: [[3, 2, 1, 0]],
    };
    expect([...findHoleEdges(mesh)]).toEqual([
      [
        [3, 2],
        [2, 1],
        [1, 0],
        [0, 3],
      ],
    ]);
  });

  it("can compute the holes for a counter-clockwise quad", function() {
    // 4---5
    // |   |
    // 1---2
    // |   |
    // 0---3
    const mesh: QuadMesh = {
      positions: [
        //
        [-1, -1, 0], // 0
        [-1, 1, 0], // 1
        [1, 1, 0], // 2
        [1, -1, 0], // 3
        [-1, 2, 0], // 4
        [1, 2, 0], // 5
      ],
      quads: [
        [0, 1, 2, 3],
        [1, 4, 5, 2],
      ],
    };
    expect([...findHoleEdges(mesh)]).toEqual([
      [
        [0, 1],
        [1, 4],
        [4, 5],
        [5, 2],
        [2, 3],
        [3, 0],
      ],
    ]);
  });
});
