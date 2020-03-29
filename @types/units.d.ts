// Vectors
type Vec2<T = number> = { x: T; y: T };
type Vec3<T = number> = { x: T; y: T; z: T };
type Vec4<T = number> = { x: T; y: T; z: T; w: T };
type Tuple2D<T = number> = [T, T];
type Tuple3D<T = number> = [T, T, T];
type Tuple4D<T = number> = [T, T, T, T];
type BoundsTuple2D<T = number> = [T, T];
type BoundsTuple3D<T = number> = [T, T, T];
type BoundsTuple4D<T = number> = [T, T, T, T];

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
type Radian = number;
