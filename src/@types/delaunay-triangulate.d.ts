declare module "delaunay-triangulate" {
  const delaunaryTrianglulate: (
    points: Tuple2[],
    pointAtInfinite?: Tuple2
  ) => Tuple3<Index>[];

  export default delaunaryTrianglulate;
}
