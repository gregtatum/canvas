declare module "geo-piecering" {
  interface Mesh {
    positions: Tuple3[];
    cells: Tuple3<Index>[];
    uvs: Tuple2[];
  }
  const geoPieceRing: (options: Partial<Options>) => Mesh;

  interface Options {
    // 1 == points, 2 == lines, 3 == triangles
    cellSize: 1 | 2 | 3;
    // x position of the center of the piece ring
    x: number;
    // y position of the center of the piece ring
    y: number;
    // z position of the center of the piece ring
    z: number;
    // the radius of the piece ring
    radius: number;
    // size of the pieces
    pieceSize: Radian;
    // radian to start drawing pieces from
    startRadian: Radian;
    // how many pieces to place
    numPieces: number;
    // how many times the piece is split
    quadsPerPiece: number;
    // the height of the ring
    height: number;
    // if cellSize == 2 draw only the outside of the shape
    drawOutline: boolean;
  }

  export default geoPieceRing;
}
