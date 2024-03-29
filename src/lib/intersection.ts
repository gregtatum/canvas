// Adapted from https://github.com/psalaets/line-intersect/
// Paul Salaets <psalaets@gmail.com>
// MIT License

export function checkIntersection(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
): null | [number, number] {
  if (
    (x1 === x3 && y1 === y3) ||
    (x1 === x4 && y1 === y4) ||
    (x2 === x3 && y2 === y3) ||
    (x2 === x4 && y2 === y4)
  ) {
    return null;
  }

  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  const numeA = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
  const numeB = (x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3);

  if (denom === 0 || (numeA === 0 && numeB === 0)) {
    return null;
  }

  const uA = numeA / denom;
  const uB = numeB / denom;

  if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
    return [uA * (x2 - x1) + x1, uA * (y2 - y1) + y1];
  }
  return null;
}
