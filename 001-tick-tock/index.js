const Simplex = require("simplex-noise");
const setupRandom = require("@tatumcreative/random");
const initializeShortcuts = require("../lib/shortcuts");
const { setupCanvas, loop, generateSeed } = require("../lib/draw");
const elasticOut = require("eases/elastic-out");
const TAU = Math.PI * 2;

{
  const seed = generateSeed();
  const random = setupRandom(seed);
  const simplex = new Simplex(random);
  const simplex3 = simplex.noise3D.bind(simplex);
  const ctx = setupCanvas();

  initializeShortcuts(seed);

  const config = {
    ctx,
    seed,
    lineSpacing: 100,
    rotationSpeed: 0.05,
    circleLineWidth: 2,
    simplex3,
    armLineWidth: 5
  };

  // Mutable state.
  const current = {
    lines: generateLines(config)
  };

  loop(now => {
    current.time = now;
    draw(config, current);
  });

  window.onhashchange = function() {
    location.reload();
  };

  window.addEventListener("resize", () => {
    current.lines = generateLines(config);
  });

  // The titles are hard to read, give them a background.
  const title = document.querySelector(".title");
  if (title) {
    Object.assign(title.style, {
      backgroundColor: "#444a",
      boxShadow: "0 0 10px 20px #444a"
    });
  }
}

function generateLines(config) {
  const { lineSpacing, ctx, simplex3 } = config;
  const { width, height } = ctx.canvas;
  const lines = [];

  const lineCountX = Math.floor(width / lineSpacing) + 1;
  const lineCountY = Math.floor(height / lineSpacing) + 1;
  for (let i = 0; i < lineCountX; i++) {
    for (let j = 0; j < lineCountY; j++) {
      lines.push({
        x: i * lineSpacing,
        y: j * lineSpacing,
        theta: simplex3(i * 0.05, j * 0.05, 0),
        r: lineSpacing * 0.5,
        rotationTimeOffset: Math.abs(simplex3(i * 0.05, j * 0.05, 0))
      });
    }
  }
  return lines;
}

function draw(config, current) {
  const {
    ctx,
    armLineWidth,
    circleLineWidth,
    rotationSpeed,
    lineSpacing
  } = config;
  const { lines, time } = current;
  // Clear out background.
  ctx.fillStyle = "#33333305";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Draw lines
  ctx.strokeStyle = "#ffffff05";

  // Draw circles
  ctx.lineWidth = circleLineWidth * devicePixelRatio;
  ctx.beginPath();
  for (const line of lines) {
    const { x, y } = line;
    ctx.moveTo(x + lineSpacing * 0.5, y);
    ctx.arc(x, y, lineSpacing * 0.5, 0, TAU);
  }
  ctx.stroke();

  ctx.strokeStyle = "#fff";
  ctx.lineCap = "round";
  ctx.lineWidth = armLineWidth * devicePixelRatio;
  ctx.beginPath();
  for (const line of lines) {
    const { x, y, theta, r, rotationTimeOffset } = line;

    // The radius of the arm needs to take into account the
    const radius = r - (armLineWidth * devicePixelRatio) / 2;
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
