import { setupCanvas } from "lib/draw";
import { ensureExists } from "lib/utils";

const TAU = Math.PI * 2;

interface DrawCurrent {
  ratio: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  size: number;
}

type DrawConfig = Readonly<{
  ctx: CanvasRenderingContext2D;
  lineColor: CanvasRenderingContext2D["strokeStyle"];
  lineWidth: number;
  baseScreenDiagonal: number;
  rotation: Radian;
}>;

type Plot = ReturnType<typeof _setupPlotting>;

// It's actually a Tuple4, but TypeScript didn't like this.
export type Line = number[] & { generation?: number };

interface Graph {
  lines: Line[];
  newLines: Line[];
}

function _drawLines(
  ctx: CanvasRenderingContext2D,
  config: DrawConfig,
  plot: Plot,
  lines: Line[]
) {
  ctx.strokeStyle = config.lineColor;
  ctx.lineCap = "round";

  for (const line of lines) {
    const a: number = line[0];
    ctx.lineWidth = plot.line(
      ((10 - (line.generation || 0)) / 10) * config.lineWidth
    );
    ctx.beginPath();
    ctx.moveTo(plot.x(line[0], line[1]), plot.y(line[0], line[1]));
    ctx.lineTo(plot.x(line[2], line[3]), plot.y(line[2], line[3]));
    ctx.stroke();
    ctx.closePath();
  }
}

function _setupPlotting(config: DrawConfig, current: DrawCurrent) {
  console.log("setupPlotting");
  const canvas = config.ctx.canvas;
  // [-1,1] range to approximately [0,canvas.size]
  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    current.ratio = width / height;

    if (current.ratio < 1) {
      current.width = width;
      current.height = height * current.ratio;
    } else {
      current.ratio = 1 / current.ratio;
      current.width = width * current.ratio;
      current.height = height;
    }

    current.offsetX = (width - current.width) / 2;
    current.offsetY = (height - current.height) / 2;

    current.size =
      Math.sqrt(width * width + height * height) / config.baseScreenDiagonal;
    console.log("resize", { ...current });
  }
  resize();
  window.addEventListener("resize", resize, false);

  const cos = Math.cos(config.rotation);
  const sin = Math.sin(config.rotation);
  console.log("Draw", { current, config });
  return {
    x(x: number, y: number): number {
      x -= 0.5;
      y -= 0.5;
      const xp = x * cos - y * sin + 0.5;
      return current.offsetX + xp * current.width;
    },
    y(x: number, y: number): number {
      x -= 0.5;
      y -= 0.5;
      const yp = x * sin + y * cos + 0.5;
      return current.offsetY + yp * current.height;
    },
    line(n: number): number {
      return n * current.size;
    },
  };
}

export function setupDraw(graph: Graph) {
  const config: DrawConfig = {
    baseScreenDiagonal: 1000,
    lineWidth: 1,
    lineColor: "#ddd",
    rotation: Math.PI / 4,
    ctx: setupCanvas(),
  };
  const current: DrawCurrent = {
    ratio: 1,
    width: 0,
    height: 0,
    offsetX: 0,
    offsetY: 0,
    size: 0,
  };

  const plot = _setupPlotting(config, current);

  function draw(redrawAll?: boolean) {
    const lines = redrawAll ? graph.lines : graph.newLines;
    _drawLines(config.ctx, config, plot, lines);
  }

  window.addEventListener("resize", draw.bind(null, true), false);
  return draw;
}
