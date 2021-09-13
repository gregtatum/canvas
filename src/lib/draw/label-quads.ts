import glsl from "glslify";
import { Regl, DrawCommand } from "lib/regl";

import * as quads from "lib/quads";
import { accessors, composeDrawCommands, drawCommand } from "lib/regl-helpers";
import { SceneContext } from "lib/draw/with-scene";
import { mat4, vec3, vec4 } from "lib/vec-math";
import { ensureExists } from "lib/utils";

const POSITION_COLOR: Tuple3 = [0.5, 0, 0];
const CELL_COLOR: Tuple3 = [0, 0.5, 0];
const DIGIT_LENGTH = 3;
const POSITION_FONT_SIZE = 0.025;
const CELL_FONT_SIZE = 0.03;
const NOOP: DrawCommand = (() => {}) as any;

interface LabelProps {
  height?: number;
  color?: Tuple3;
  model: MatrixTuple4x4;
  modelNormal: MatrixTuple3x3;
}

type LabelQuadsContext = SceneContext & { quadIndex: QuadIndex | null };
type DrawLabelQuads = DrawCommand<LabelQuadsContext, LabelProps>;

interface LabelQuadsCommands {
  drawLines: DrawLabelQuads;
  drawCellIndices: DrawLabelQuads;
  drawPositionIndices: DrawLabelQuads;
}

export function createDrawLabelQuads(
  regl: Regl,
  mesh: QuadMesh
): LabelQuadsCommands {
  if (mesh.positions.length > 999 || mesh.quads.length > 1000) {
    return {
      drawLines: NOOP as any,
      drawCellIndices: NOOP as any,
      drawPositionIndices: NOOP as any,
    };
  }

  const pickingRay = createPickingRay(regl, mesh);

  const drawNumbers = createDrawNumbers(regl);
  return {
    drawLines: composeDrawCommands(pickingRay, createDrawLines(regl, mesh)),
    drawCellIndices: composeDrawCommands(
      pickingRay,
      createDrawCellIndices(regl, mesh, drawNumbers)
    ),
    drawPositionIndices: composeDrawCommands(
      pickingRay,
      createDrawPositionIndices(regl, mesh, drawNumbers)
    ),
  };
}

function createHoveredQuadDisplay() {
  const div = document.createElement("div");
  div.innerHTML = `
    <div>Quad:</div>
    <div></div>
    <div></div>
    <div></div>

    <div>Point A:</div>
    <div></div>
    <div></div>
    <div></div>

    <div>Point B:</div>
    <div></div>
    <div></div>
    <div></div>

    <div>Point C:</div>
    <div></div>
    <div></div>
    <div></div>

    <div>Point D:</div>
    <div></div>
    <div></div>
    <div></div>
    </div>
  `;
  Object.assign(div.style, {
    fontFamily: "'Courier New'",
    position: "absolute",
    top: 0,
    right: 0,
    fontSize: "13px",
    color: "#fff",
    visibility: "hidden",
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    columnGap: "15px",
    rowGap: "2px",
  });

  document.body.appendChild(div);

  const children = [...div.children] as HTMLDivElement[];
  console.log(children);
  const positionsDiv = children.slice(4);
  if (positionsDiv.length !== 4 * 4) {
    throw new Error(
      "Positions div had the wrong number of divs: " + positionsDiv.length
    );
  }

  for (let i = 0; i < children.length; i++) {
    if (i % 4 === 0) {
      Object.assign(children[i], {
        textAlign: "right",
      });
    }
  }

  return {
    div: div,
    quadDiv: ensureExists(children[1], "quadDiv"),
    positionsDiv,
  };
}

function lowerPrecision(n: number, digits = 3) {
  const units = Math.pow(10, digits);
  n = Math.round(n * units) / units;
  if (Object.is(n, -0)) {
    // Remove -0.
    n = 0;
  }
  return n;
}

function createPickingRay(regl: Regl, mesh: QuadMesh): DrawLabelQuads {
  const mouse: Tuple2 = [-1000, -1000];

  const hoveredQuadDisplay = createHoveredQuadDisplay();

  window.addEventListener("mousemove", (event) => {
    const { canvas } = regl._gl;
    const rect = (canvas as HTMLCanvasElement).getBoundingClientRect();
    const dpi = canvas.width / rect.width;
    mouse[0] = event.pageX * dpi;
    mouse[1] = event.pageY * dpi;
  });

  window.addEventListener("mouseout", (event) => {
    mouse[0] = -1000;
    mouse[1] = -1000;
  });

  const _triangle: Tuple3 = [0, 0, 0];
  let lastQuadIndex: Index;
  const _arr: Tuple3 = [0, 0, 0];
  const positionsTransformed: Tuple3[] = [];
  for (let i = 0; i < mesh.positions.length; i++) {
    positionsTransformed.push(vec3.create());
  }
  return drawCommand(regl, {
    name: "pickingRay",
    context: {
      quadIndex: (
        { camera }: SceneContext,
        props: LabelProps
      ): QuadIndex | null => {
        const ray = camera.createPickingRay(mouse);
        const { quads, positions } = mesh;
        for (let i = 0; i < positions.length; i++) {
          const pOriginal = positions[i];
          const pTransformed = positionsTransformed[i];
          vec3.transformMat4(pTransformed, pOriginal, props.model);
        }

        let quadIndex = 0;
        for (; quadIndex < quads.length; quadIndex++) {
          const quad = quads[quadIndex];
          _triangle[0] = quad[0];
          _triangle[1] = quad[1];
          _triangle[2] = quad[2];
          if (ray.intersectsTriangleCell(_triangle, positionsTransformed)) {
            break;
          }
          _triangle[0] = quad[1];
          _triangle[1] = quad[2];
          _triangle[2] = quad[3];
          if (ray.intersectsTriangleCell(_triangle, positionsTransformed)) {
            break;
          }
        }
        if (quadIndex < quads.length) {
          if (lastQuadIndex !== quadIndex) {
            // console.log({ quadIndex, quad: quads[quadIndex] });
            hoveredQuadDisplay.quadDiv.innerText = String(quadIndex);
            const quad = quads[quadIndex];
            for (let i = 0; i < hoveredQuadDisplay.positionsDiv.length; i++) {
              const div = hoveredQuadDisplay.positionsDiv[i];
              if (i % 4 === 0) {
                continue;
              }
              const positionIndex = quad[Math.floor((i - 1) / 4)];
              const position = positions[positionIndex][(i - 1) % 4];
              div.innerText = lowerPrecision(position).toString();
            }
          }
          lastQuadIndex = quadIndex;
          if (hoveredQuadDisplay.div.style.visibility !== "visible") {
            hoveredQuadDisplay.div.style.visibility = "visible";
          }

          return quadIndex;
        }

        if (hoveredQuadDisplay.div.style.visibility !== "hidden") {
          hoveredQuadDisplay.div.style.visibility = "hidden";
        }
        return null;
      },
    },
  });
}

function createDrawLines(regl: Regl, mesh: QuadMesh): DrawLabelQuads {
  const { getProp } = accessors<LabelProps, SceneContext>();
  const elements = quads.getElements(mesh, "lines");
  let lastQuadIndex: Index;
  let lastQuadElements: Index[];

  return drawCommand(regl, {
    name: "labelQuadsDrawLines",
    vert: glsl`
      precision mediump float;
      attribute vec3 normal, position;
      uniform mat4 model, view, projection;
      varying vec3 vNormal;

      void main() {
        vNormal = normal;
        gl_Position = projection * view * model * vec4(position, 1.0);
      }
    `,
    frag: glsl`
      precision mediump float;
      varying vec3 vNormal;

      void main() {
        float brightness = mix(
          0.5,
          1.0,
          0.5 + 0.5 * dot(vNormal, vec3(0.0, 1.0, 0.0))
        );
        gl_FragColor = vec4(vec3(brightness), 1.0);
      }
    `,
    attributes: {
      position: mesh.positions,
      normal: mesh.normals,
    },
    uniforms: {
      model: getProp("model"),
    },
    elements: ({ quadIndex }: LabelQuadsContext) => {
      if (quadIndex === null) {
        return elements;
      }
      let quadElements = lastQuadElements;
      if (lastQuadIndex !== quadIndex || !quadElements) {
        const [a, b, c, d] = mesh.quads[quadIndex];
        quadElements = [a, b, b, c, c, d, d, a];
      }
      return quadElements;
    },
    primitive: "lines",
    cull: { enable: false },
    depth: { enable: false },
  });
}

function createDrawNumbers(regl: Regl): DrawLabelQuads {
  return drawCommand(regl, {
    name: "labelQuadsDrawNumbers",
    vert: glsl`
      precision mediump float;
      attribute vec3 normal, position;
      attribute vec3 digits;
      uniform mat4 model, view, projection;
      uniform float viewportHeight, fontHeight;
      varying vec3 vDigits;
      void main() {
        vDigits = digits;
        gl_Position = projection * view * model * vec4(position, 1.0);
        gl_PointSize = viewportHeight * fontHeight;
      }
    `,
    frag: glsl`
      precision mediump float;
      uniform sampler2D numbersTexture;
      uniform vec3 color;
      varying vec3 vDigits;

      float DIGIT_LENGTH = ${DIGIT_LENGTH.toFixed(1)};
      float TOP_OFFSET = (DIGIT_LENGTH - 1.0) / 2.0;
      float TEXTURE_GRID_SIZE = 4.0;
      float TEXTURE_GRID_SIZE_INVERSE = 1.0 / TEXTURE_GRID_SIZE;

      void main() {
        // Make the UV space to be the size of the digits.
        vec2 uv = gl_PointCoord * vec2(DIGIT_LENGTH);

        // Shift the UV basis coordinates to center the numbers in the Y axis. Use mod()
        // to keep the digit calculations correctly in range for the digit lookups.
        uv.y = mod(uv.y + TOP_OFFSET, DIGIT_LENGTH);

        // Lookup which digit we are on, based on the UV coordinate.
        float digitOffset = floor(uv.x);
        int digitOffsetInt = int(digitOffset);
        uv.x -= digitOffset;

        // Determine the number to display, based on which digit we are on.
        float number;
        for(int i = 0; i < ${DIGIT_LENGTH}; i++) {
          if (digitOffsetInt == i) {
            number = vDigits[int(i)];
          }
        }

        // If rendering outside the Y zone, discard this pixel.
        if (uv.y > 1.0) {
          discard;
        }

        // Adjust the UV to be offset and sized according to the numbers texture.
        vec2 textureUV = TEXTURE_GRID_SIZE_INVERSE * vec2(
          uv.x + mod(number, TEXTURE_GRID_SIZE),
          uv.y + floor(number * TEXTURE_GRID_SIZE_INVERSE)
        );
        vec4 textureColor = texture2D(numbersTexture, textureUV);
        gl_FragColor = vec4(color * textureColor.rgb, textureColor.a);
      }
    `,
    uniforms: {
      viewportHeight: regl.context("viewportHeight"),
      numbersTexture: regl.texture(createTexture()),
    },
    primitive: "points",
    depth: { enable: false },
    blend: {
      enable: true,
      func: {
        srcRGB: "src alpha",
        srcAlpha: 1,
        dstRGB: "one",
        dstAlpha: 1,
      },
      equation: {
        rgb: "add",
        alpha: "add",
      },
    },
  });
}

function createDrawCellIndices(
  regl: Regl,
  mesh: QuadMesh,
  drawNumbers: DrawLabelQuads
): DrawLabelQuads {
  const centerPositions = quads.computeCenterPositions(mesh);
  const digits = toDigits(centerPositions);
  const { getProp } = accessors<LabelProps, SceneContext>();

  const drawCells: DrawLabelQuads = drawCommand<LabelProps>(regl, {
    name: "drawCellIndices",
    attributes: {
      position: centerPositions,
      digits: digits,
    },
    uniforms: {
      fontHeight: getProp("height", CELL_FONT_SIZE),
      color: getProp("color", CELL_COLOR),
      model: getProp("model"),
    },
    count: ({ quadIndex }: LabelQuadsContext) =>
      quadIndex === null ? centerPositions.length : 1,
    offset: ({ quadIndex }: LabelQuadsContext) =>
      quadIndex === null ? 0 : quadIndex,
  });

  return composeDrawCommands(drawCells, drawNumbers);
}

function createDrawPositionIndices(
  regl: Regl,
  mesh: QuadMesh,
  drawNumbers: DrawLabelQuads
): DrawLabelQuads {
  const positions = mesh.positions;
  const digits = toDigits(positions);
  const { getProp } = accessors<LabelProps, SceneContext>();

  const drawPositions = drawCommand<LabelProps>(regl, {
    name: "drawPositionIndices",
    attributes: {
      position: positions,
      digits: digits,
    },
    uniforms: {
      fontHeight: getProp("height", POSITION_FONT_SIZE),
      color: getProp("color", POSITION_COLOR),
      model: getProp("model"),
    },
    count: positions.length,
  });

  return composeDrawCommands(drawPositions, drawNumbers);
}

function toDigits(centers: Tuple3[]): Tuple3[] {
  if (centers.length > 999) {
    throw new Error(
      "This function only goes up to 999. Another digit needs to be added."
    );
  }
  const BLANK_DIGIT = 10;
  return centers.map((_, cellIndex) => {
    let sum = 0;
    const digits = [];
    for (let i = 2; i >= 0; i--) {
      const zeros = Math.pow(10, i);
      const n = Math.floor((cellIndex - sum) / zeros);
      sum += n * zeros;
      digits.push(n);
    }
    if (digits[0] === 0 && digits[1] === 0) {
      digits[1] = BLANK_DIGIT;
    }
    if (digits[0] === 0) {
      digits[0] = BLANK_DIGIT;
    }
    return digits as Tuple3;
  });
}

function createTexture(): HTMLCanvasElement {
  // Units of operation.
  const side = 256;
  const row = 4;
  const unit = side / row;
  const unitHalf = unit / 2;

  // Set up canvas and fonts.
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, side, side);
  ctx.fillStyle = "#fff";
  ctx.font = `${Math.floor((1.2 * side) / 4)}px sans-serif`;
  const { width } = ctx.measureText("0");

  // Draw the numbers
  loop: for (let y = 0; y < row; y++) {
    for (let x = 0; x < row; x++) {
      const n = y * row + x;
      if (n > 9) {
        break loop;
      }
      ctx.fillText(
        String(n),
        x * unit + unitHalf - width / 2,
        y * unit + unitHalf + width * 0.6
      );
    }
  }

  // Draw debug grid, and append this to the DOM.
  // ctx.fillRect(0, unit * 1, side, 1)
  // ctx.fillRect(0, unit * 2, side, 1)
  // ctx.fillRect(0, unit * 3, side, 1)
  // ctx.fillRect(unit * 1, 0, 1, side)
  // ctx.fillRect(unit * 2, 0, 1, side)
  // ctx.fillRect(unit * 3, 0, 1, side)
  // document.body.appendChild(canvas)
  // canvas.style.position = 'absolute'
  // canvas.style.top = 0
  // canvas.style.bottom = 0

  return canvas;
}
