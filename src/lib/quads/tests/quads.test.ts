import * as Quads from "../";
import { UnhandledCaseError } from "lib/utils";

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
  const lines = getGrid(halfW, halfH);
  for (const quad of mesh.quads) {
    const [aI, bI, cI, dI] = quad;
    const a = mesh.positions[aI];
    const b = mesh.positions[bI];
    const c = mesh.positions[cI];
    const d = mesh.positions[dI];

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

      if (Math.abs(slope) > 0.5) {
        const slope = (bx - ax) / (by - ay);
        const sign = dy > 0 ? 1 : -1;
        for (let y = 0; y < Math.abs(dy); y++) {
          const x = ax + slope * dy;
          if (x >= 0.0) {
            const lineI = ay + y * sign;
            const line = lines[lineI];
            if (line) {
              lines[lineI] = replaceCodepoint(line, "┃", Math.round(x));
            }
          }
        }
      } else {
        const sign = dx > 0 ? 1 : -1;
        for (let x = 0; x < Math.abs(dx); x++) {
          const y = ay + slope * dx;
          if (y >= 0.0) {
            const lineI = Math.round(y);
            const line = lines[lineI];
            if (line) {
              lines[lineI] = replaceCodepoint(line, "━", ax + x * sign);
            }
          }
        }
      }
    }

    printSegment(a, b);
    printSegment(b, c);
    printSegment(c, d);
    printSegment(d, a);

    function printPoint(p: Tuple3) {
      const [x, y] = applyOrthogonal(p);
      const line = lines[y];
      if (line) {
        for (const i in Object.keys([...line])) {
          if (Number(i) === x) {
            lines[y] = replaceCodepoint(line, "◆", Number(i));
            break;
          }
        }
      }
    }

    printPoint(a);
    printPoint(b);
    printPoint(c);
    printPoint(d);
  }
  let string = "";
  for (const line of lines) {
    string += line.trimEnd();
    string += "\n";
  }
  return string;
}

function replaceCodepoint(string: string, char: string, codePointIndex: Index) {
  let codeUnitIndex: Index = 0;
  for (let i = 0; i < codePointIndex; i++) {
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

describe("replaceCodepoint", () => {
  it("replaces text from the basic multilingual plane", () => {
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    expect(replaceCodepoint(alphabet, "_", 3)).toEqual(
      "abc_efghijklmnopqrstuvwxyz"
    );
    expect(replaceCodepoint(alphabet, "👍", 3)).toEqual(
      "abc👍efghijklmnopqrstuvwxyz"
    );
  });

  it("replaces text from higher planes", () => {
    const phrase = "Yes 👍 sounds good";
    expect(phrase.length).toEqual(18);
    expect([...phrase].length).toEqual(17);
    expect(replaceCodepoint(phrase, "_", 6)).toEqual("Yes 👍 _ounds good");
  });
});

function assertArt(mesh: QuadMesh, axis: "x" | "y" | "z", expect: string) {
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
    let msg = "Art does not match.\n";
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

describe("QuadMesh", () => {
  it("can create a quad from positions", () => {
    const { mesh } = Quads.createQuad({
      positions: [
        [-4.0, 0.0, -3.0],
        [-4.0, 0.0, 3.0],
        [1.0, 0.0, 3.0],
        [1.0, 0.0, -3.0],
      ],
    });

    assertArt(
      mesh,
      "y",
      `
      │    -5 -4 -3 -2 -1  0  1  2  3  4  5
      │ -5  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      │ -4  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      │ -3  ·  ◆━━━━━━━━━━━━━━◆  ·  ·  ·  ·
      │ -2  ·  ┃  ·  ·  ·  ┊  ┃  ·  ·  ·  ·
      │ -1  ·  ┃  ·  ·  ·  ┊  ┃  ·  ·  ·  ·
      │  0 ┈┈┈┈┃┈┈┈┈┈┈┈┈┈┈┈┊┈┈┃┈┈┈┈┈┈┈┈┈┈┈┈┈
      │  1  ·  ┃  ·  ·  ·  ┊  ┃  ·  ·  ·  ·
      │  2  ·  ┃  ·  ·  ·  ┊  ┃  ·  ·  ·  ·
      │  3  ·  ◆━━━━━━━━━━━━━━◆  ·  ·  ·  ·
      │  4  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      │  5  ·  ·  ·  ·  ·  ┊  ·  ·  ·  ·  ·
      `
    );
  });
});
