import * as Quads from "../";
import { UnhandledCaseError } from "lib/utils";

function getLine([x, y]: Tuple2): string {
  const tau = Math.PI * 2;
  const theta = (tau + Math.atan2(y, x)) % tau;
  //5  6  7
  //4     0
  //3  2  1
  switch (Math.round((theta / tau) * 8) % 8) {
    case 0:
      return "━";
    case 1:
      return "⟍";
    case 2:
      return "┃";
    case 3:
      return "⟋";
    case 4:
      return "━";
    case 5:
      return "⟍";
    case 6:
      return "┃";
    case 7:
      return "⟋";
    default:
      throw new Error("Unable to convert a vector to an arrow.");
  }
}

function getGrid(width: Integer, height: Integer): string[] {
  const lines = [];
  {
    let s = "│    ";
    for (let x = -width; x <= width; x++) {
      s += x >= 0 ? ` ${x} ` : `${x} `;
    }
    lines.push(s);
  }

  for (let y = -height; y <= height; y++) {
    let s = "│ ";
    s += y >= 0 ? ` ${y} ` : `${y} `;

    for (let x = -width; x <= width; x++) {
      if (x === 0) {
        s += y === 0 ? "┈┊┈" : " ┊ ";
      } else if (y === 0) {
        s += "┈┈┈";
      } else {
        s += " · ";
      }
    }
    lines.push(s);
  }
  return lines;
}

/// Draw a [QuadMesh] using text art. See <https://gregtatum.com/writing/2020/ascii-physics-system/>
function quadMeshToTextArt(mesh: QuadMesh, axis: "x" | "y" | "z"): string {
  const marginX = 6;
  const marginY = 1;
  const colSize = 3;
  const halfW: Integer = 5;
  const halfH: Integer = 5;

  function translate(px: number, py: number): Tuple2<Integer> {
    return [marginX + (px + halfW) * colSize, marginY + py + halfH];
  }

  function applyOrthogonal(p: Tuple3) {
    switch (axis) {
      case "x":
        return translate(p[2], p[1]);
      case "y":
        return translate(p[0], p[2]);
      case "z":
        return translate(p[0], p[1]);
      default:
        throw new UnhandledCaseError(axis, "Axis");
    }
  }

  function printSegment(a: Tuple3, b: Tuple3) {
    const [ax, ay] = applyOrthogonal(a);
    const [bx, by] = applyOrthogonal(b);
    const dy = by - ay;
    const dx = bx - ax;
    const slope = dx === 0 ? 100000000.0 : (by - ay) / (bx - ax);
    const ch = getLine([dx, dy]);
    if (Math.abs(slope) > 0.5) {
      const slope = (bx - ax) / (by - ay);
      const sign = dy > 0 ? 1 : -1;
      for (let y = 0; y < Math.abs(dy); y++) {
        const x = ax + slope * y * sign;
        if (x >= 0) {
          const lineI = Math.round(ay + y * sign);
          const line = lines[lineI];
          if (line) {
            lines[lineI] = replaceCodepoint(line, ch, Math.round(x));
          }
        }
      }
    } else {
      const sign = dx > 0 ? 1 : -1;
      for (let x = 0; x < Math.abs(dx); x++) {
        const y = ay - slope * x * sign * -1;
        if (y >= 0) {
          const lineI = Math.round(y);
          const line = lines[lineI];
          if (line) {
            lines[lineI] = replaceCodepoint(
              line,
              ch,
              Math.round(ax + x * sign)
            );
          }
        }
      }
    }
  }

  function printPoint(p: Tuple3) {
    const [x, y] = applyOrthogonal(p);
    const lineI = Math.round(y);
    const line = lines[lineI];
    if (line) {
      for (const i in Object.keys([...line])) {
        if (Number(i) === Math.round(x)) {
          lines[lineI] = replaceCodepoint(line, "◆", Number(i));
          break;
        }
      }
    }
  }

  const lines = getGrid(halfW, halfH);
  for (const quad of mesh.quads) {
    const [a, b, c, d] = Quads.getPositions(mesh, quad);
    printSegment(a, b);
    printSegment(b, c);
    printSegment(c, d);
    printSegment(d, a);
  }
  for (const quad of mesh.quads) {
    for (const position of Quads.getPositions(mesh, quad)) {
      printPoint(position);
    }
  }
  let string = "";
  for (const line of lines) {
    string += line.trimEnd();
    string += "\n";
  }
  return string;
}

export function replaceCodepoint(
  string: string,
  char: string,
  codePointIndex: Index
) {
  let codeUnitIndex: Index = 0;
  for (let i = 0; i < codePointIndex && codeUnitIndex < string.length; i++) {
    if (string[codeUnitIndex].codePointAt(0)! >> 10 === 0b110110) {
      // This is a surrogate pair.
      if (string[codeUnitIndex + 1].codePointAt(0)! >> 10 !== 0b110111) {
        throw new Error(
          "The string text was malformed UTF-16. No matching low surrogate."
        );
      }
      codeUnitIndex++;
    }
    codeUnitIndex++;
  }
  return (
    string.substring(0, codeUnitIndex) +
    char +
    string.substring(codeUnitIndex + 1)
  );
}

export function assertArt(
  mesh: QuadMesh,
  axis: "x" | "y" | "z",
  expect: string
) {
  const actual = quadMeshToTextArt(mesh, axis);

  const expectLines = expect.split("\n");
  let expectI = 0;

  function skipWhiteSpace() {
    for (; expectI < expectLines.length; expectI++) {
      if (expectLines[expectI].trim() !== "") {
        break;
      }
    }
  }
  // Skip leading whitespace
  skipWhiteSpace();

  function reportIsDifferent() {
    let msg = `Art does not match (${axis} axis).\n`;
    msg += "┌─────────────────────────────────────\n";
    msg += "│ Expected:\n";
    msg += "├─────────────────────────────────────\n";
    for (let line of expect.split("\n")) {
      line = line.trim();
      if (line) {
        msg += line;
        msg += "\n";
      }
    }
    msg += "├─────────────────────────────────────\n";
    msg += "│ Actual:\n";
    msg += "├─────────────────────────────────────\n";
    for (let line of actual.split("\n")) {
      line = line.trim();
      if (line) {
        msg += line;
        msg += "\n";
      }
    }
    msg += "└─────────────────────────────────────\n";
    throw new Error(msg);
  }

  for (const actualLine of actual.split("\n")) {
    const expectedLine = expectLines[expectI++];
    if (
      expectedLine === undefined ||
      actualLine.trim() !== expectedLine.trim()
    ) {
      reportIsDifferent();
    }
  }
  skipWhiteSpace();
  if (expectLines[expectI]) {
    reportIsDifferent();
  }
}

/**
 * Lower the precicion of some values so they can be used in
 * assertions and logging better.
 */
export function lowerPrecision(array: Array<number[]>, digits = 3): void {
  const units = Math.pow(10, digits);
  for (const position of array) {
    for (let i = 0; i < position.length; i++) {
      let n = position[i];
      n = Math.round(n * units) / units;
      if (Object.is(n, -0)) {
        // Remove -0.
        n = 0;
      }
      position[i] = n;
    }
  }
}
