// Vectors
type Vec2<T = number> = { x: T; y: T };
type Vec3<T = number> = { x: T; y: T; z: T };
type Vec4<T = number> = { x: T; y: T; z: T; w: T };
type Tuple2<T = number> = [T, T];
type Tuple3<T = number> = [T, T, T];
type Tuple4<T = number> = [T, T, T, T];
// prettier-ignore
type MatrixTuple2x2 = [
  number, number,
  number, number,
];
// prettier-ignore
type MatrixTuple2x3 = [
  number, number,
  number, number,
  number, number,
];
// prettier-ignore
type MatrixTuple3x3 = [
  number, number, number,
  number, number, number,
  number, number, number,
];
// prettier-ignore
type MatrixTuple4x4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];
type BoundsTuple2D<T = number> = [T, T];
type BoundsTuple3D<T = number> = [T, T, T];
type BoundsTuple4D<T = number> = [T, T, T, T];

type Quad = Tuple4<PositionIndex>;
type Edge = Tuple2<PositionIndex>;

interface QuadMesh {
  positions: Tuple3[];
  quads: Tuple4<Index>[];
  normals?: Tuple3[];
}

interface QuadMeshNormals {
  positions: Tuple3[];
  quads: Tuple4<Index>[];
  normals: Tuple3[];
}

interface TriangleMesh {
  positions: Tuple3[];
  cells: Tuple3<Index>[];
  normals?: Tuple3[];
}

interface TriangleMeshNormals {
  positions: Tuple3[];
  cells: Tuple3<Index>[];
  normals: Tuple3[];
}

type Triangle = Tuple3<Tuple3>;

// Numbers. These are just hints.
type Milliseconds = number;
type Seconds = number;
type Minutes = number;
type Hours = number;
type CssPixels = number;
type WorldSpace = number;
type DevicePixels = number;
type Integer = number;
type Scalar = number;
type Index = number;
type QuadIndex = number;
type Radian = number;
type UnitInterval = number;
type CellIndex = number;
type PositionIndex = number;
type NormalIndex = number;
