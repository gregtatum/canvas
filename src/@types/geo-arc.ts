declare module "geo-arc" {
  interface Mesh {
    positions: Tuple3[];
    cells: Tuple3<Index>[];
    uvs: Tuple2[];
  }
  const geoArc: (options: Partial<Options>) => Mesh;

  interface Options {
    // 1 == points, 2 == lines, 3 == triangles
    cellSize: 1 | 2 | 3;
    // x position of the center of the arc
    x: number;
    // y position of the center of the arc
    y: number;
    // z position of the center of the arc
    z: number;
    // start radian for the arc
    startRadian: number;
    // end radian for the arc
    endRadian: number;
    // inner radius of the arc
    innerRadius: number;
    // outside radius of the arc
    outerRadius: number;
    // subdivision from inside out
    numBands: number;
    // subdivision along curve
    numSlices: number;
    // if cellSize == 2 draw only the outside of the shape
    drawOutline: boolean;
  }

  export default geoArc;
}
