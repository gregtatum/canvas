import lerp from "lerp";

type SetupCanvasConfig = Partial<{
  alpha: boolean;
  container: HTMLElement;
}>;

export function setupCanvas(
  config: SetupCanvasConfig = {}
): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  const maybeCtx = canvas.getContext("2d", { alpha: Boolean(config.alpha) });
  if (!maybeCtx) {
    throw new Error("Could not get a 2d context.");
  }
  const ctx = maybeCtx;
  const container = config.container || document.body;
  container.appendChild(canvas);

  const params = new URLSearchParams(window.location.search);
  const width = params.has("width") ? Number(params.get("width")) : null;
  const height = params.has("height") ? Number(params.get("height")) : null;
  const dpi = params.has("dpi") ? Number(params.get("dpi")) : null;
  console.log(
    [
      "Url API:",
      "  http://localhost:9966/?width=1000&height=1000",
      "  http://localhost:9966/?dpi=10",
    ].join("\n")
  );

  function resize(): void {
    if (width && height) {
      canvas.width = width;
      canvas.height = height;
    } else {
      const scale = dpi ? dpi : devicePixelRatio;
      canvas.width = window.innerWidth * scale;
      canvas.height = window.innerHeight * scale;
      ctx.scale(scale, scale);
      console.log(`Resolution: ${canvas.width}x${canvas.height}`);
    }
  }

  resize();
  window.addEventListener("resize", resize, false);

  return ctx;
}

type Seconds = number;
type LoopCallback = (time: Seconds, dt: Seconds) => void;

export function loop(callback: LoopCallback): void {
  let startTime: null | number = null;
  let lastTime = 0;

  function innerLoop(): void {
    let now = 0;
    let dt;
    if (startTime === null) {
      startTime = Date.now() / 1000;
      dt = 1 / 60;
    } else {
      now = Date.now() / 1000 - startTime;
      dt = Math.min(now - lastTime, 1 / 30);
      lastTime = now;
    }
    callback(now, dt);
    requestAnimationFrame(innerLoop);
  }

  requestAnimationFrame(innerLoop);
}

export function generateSeed(): string {
  const seed =
    window.location.hash.substr(1) || String(Math.random()).split(".")[1];
  console.log("current seed", seed);

  // Reload the page on hash change.
  window.addEventListener("hashchange", () => {
    location.reload();
  });
  return seed;
}

const TAU = Math.PI;
export function lerpTheta(a: number, b: number, t: number): number {
  a = ((a % TAU) + TAU) % TAU;
  b = ((b % TAU) + TAU) % TAU;

  if (b - a > Math.PI) {
    a += TAU;
  }
  return lerp(a, b, t);
}
