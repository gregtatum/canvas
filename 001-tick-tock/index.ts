import Simplex from "simplex-noise";
import setupRandom from "@tatumcreative/random";
import initializeShortcuts from "../lib/shortcuts";
import { setupCanvas, loop, generateSeed } from "../lib/draw";
import elasticOut from "eases/elastic-out";
const TAU = Math.PI * 2;

type Config = ReturnType<typeof getConfig>;
type Current = ReturnType<typeof getCurrent>;

type Line = {
  x: CssPixels;
  y: CssPixels;
  theta: Radian;
  r: CssPixels;
  rotationTimeOffset: number;
};

{
  const config = getConfig();
  const current = getCurrent(config);

  loop(now => {
    current.time = now;
    draw(config, current);
  });

  window.onhashchange = (): void => {
    location.reload();
  };

  window.addEventListener("resize", () => {
    current.lines = generateLines(config);
  });

  // The titles are hard to read, give them a background.
  const title: HTMLElement | null = document.querySelector(".title");
  if (title) {
    Object.assign(title.style, {
      backgroundColor: "#444a",
      boxShadow: "0 0 10px 20px #444a",
    });
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getConfig() {
  const ctx = setupCanvas();
  const seed = generateSeed();
  const random = setupRandom(seed);
  const simplex = new Simplex(random);
  const simplex3 = simplex.noise3D.bind(simplex);

  initializeShortcuts(seed);

  return {
    ctx,
    seed,
    lineSpacing: 50,
    rotationSpeed: 0.05,
    circleLineWidth: 2,
    simplex3,
    armLineWidth: 5,
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getCurrent(config: Config) {
  return {
    lines: generateLines(config),
    time: 0,
  };
}

function generateLines(config: Config): Line[] {
  const { lineSpacing, simplex3 } = config;
  const lines = [];

  const lineCountX = Math.floor(innerWidth / lineSpacing) + 1;
  const lineCountY = Math.floor(innerHeight / lineSpacing) + 1;
  for (let i = 0; i < lineCountX; i++) {
    for (let j = 0; j < lineCountY; j++) {
      lines.push({
        x: i * lineSpacing,
        y: j * lineSpacing,
        theta: simplex3(i * 0.05, j * 0.05, 0),
        r: lineSpacing * 0.5,
        rotationTimeOffset: Math.abs(simplex3(i * 0.05, j * 0.05, 0)),
      });
    }
  }
  return lines;
}

function draw(config: Config, current: Current): void {
  const {
    ctx,
    armLineWidth,
    circleLineWidth,
    rotationSpeed,
    lineSpacing,
  } = config;
  const { lines, time } = current;
  // Clear out background.
  ctx.fillStyle = "#33333305";
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  // Draw lines
  ctx.strokeStyle = "#ffffff05";

  // Draw circles
  ctx.lineWidth = circleLineWidth;
  ctx.beginPath();
  for (const line of lines) {
    const { x, y } = line;
    ctx.moveTo(x + lineSpacing * 0.5, y);
    ctx.arc(x, y, lineSpacing * 0.5, 0, TAU);
  }
  ctx.stroke();

  ctx.strokeStyle = "#fff";
  ctx.lineCap = "round";
  ctx.lineWidth = armLineWidth;
  ctx.beginPath();
  for (const line of lines) {
    const { x, y, theta, r, rotationTimeOffset } = line;

    // The radius of the arm needs to take into account the
    const radius = r - armLineWidth / 2;
    ctx.moveTo(x, y);
    const easedTime =
      theta + elasticOut((time * rotationSpeed + rotationTimeOffset) % 1) * TAU;

    ctx.lineTo(
      x + Math.cos(easedTime) * radius,
      y + Math.sin(easedTime) * radius
    );
  }

  ctx.stroke();
}
