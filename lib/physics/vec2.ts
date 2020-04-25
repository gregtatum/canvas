export function create(): Vec2 {
  return { x: 0, y: 0 };
}

export function clone(p: Vec2): Vec2 {
  return { x: p.x, y: p.y };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function add(a: Vec2, b: Vec2, target: Vec2 = create()): Vec2 {
  target.x = a.x + b.x;
  target.y = a.y + b.y;
  return target;
}

export function subtract(a: Vec2, b: Vec2, target: Vec2 = create()): Vec2 {
  target.x = a.x - b.x;
  target.y = a.y - b.y;
  return target;
}

export function multiply(a: Vec2, b: Vec2, target: Vec2 = create()): Vec2 {
  target.x = a.x * b.x;
  target.y = a.y * b.y;
  return target;
}

export function multiplyScalar(
  a: Vec2,
  scalar: number,
  target: Vec2 = create()
): Vec2 {
  target.x = a.x * scalar;
  target.y = a.y * scalar;
  return target;
}

export function divide(a: Vec2, b: Vec2, target: Vec2 = create()): Vec2 {
  target.x = a.x / b.x;
  target.y = a.y / b.y;
  return target;
}

export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distanceSq(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function normalize(position: Vec2, output: Vec2 = position): Vec2 {
  const { x, y } = position;
  const d = Math.sqrt(x * x + y * y);
  if (d === 0) {
    throw new Error("Tried to normalize a 0 length point.");
  }
  output.x /= d;
  output.y /= d;
  return output;
}

// Reflects the vectorN about the normal.
// 𝑟=𝑑−2(𝑑⋅𝑛)𝑛
// https://math.stackexchange.com/questions/13261/how-to-get-a-reflection-vector
export function reflect(
  vectorIn: Vec2,
  normal: Vec2,
  vectorOut: Vec2 = vectorIn
): Vec2 {
  const d = dot(vectorIn, normal);
  vectorOut.x = vectorIn.x - 2 * d * normal.x;
  vectorOut.y = vectorIn.y - 2 * d * normal.y;
  return vectorOut;
}
