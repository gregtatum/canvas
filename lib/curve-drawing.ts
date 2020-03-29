export type Curve = {
  line: Vec2[];
  cpLeft: Vec2[];
  cpRight: Vec2[];
  smoothness: number;
  distance: number;
};

type Config = {
  drawingTarget: HTMLElement;
  onCurveDrawn: (curve: Curve) => void;
  pointsPerDistance: number;
};

type Current = {
  points: Vec2[];
  distancePerPoint: number[];
  isDrawingCurve: boolean;
  totalLineDistance: number;
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function setupCurveDrawing(config: Config) {
  const current: Current = {
    points: [],
    distancePerPoint: [],
    isDrawingCurve: false,
    totalLineDistance: 0,
  };

  const { drawingTarget } = config;

  drawingTarget.addEventListener("mousedown", onMouseDown);
  drawingTarget.addEventListener("touchmove", onTouchMove);
  drawingTarget.addEventListener("touchstart", onTouchStart);
  drawingTarget.style.touchAction = "none";

  function onTouchStart(event: TouchEvent): void {
    event.preventDefault();

    if (current.isDrawingCurve === false) {
      drawingTarget.addEventListener("touchend", onTouchEnd);

      hideUI();

      // Reset the current state
      current.isDrawingCurve = true;
      current.points = [];
      current.distancePerPoint = [];
      current.totalLineDistance = 0;

      const { pageX, pageY } = event.touches[0];
      addPoint(config, current, pageX, pageY);
    }
  }

  function onMouseDown(event: MouseEvent): void {
    if (current.isDrawingCurve === false) {
      drawingTarget.addEventListener("mousemove", onMouseMove);
      drawingTarget.addEventListener("mouseout", onMouseMoveDone);
      drawingTarget.addEventListener("mouseup", onMouseMoveDone);

      hideUI();

      current.isDrawingCurve = true;
      current.points = [];
      current.distancePerPoint = [];
      current.totalLineDistance = 0;

      addPoint(config, current, event.pageX, event.pageY);
    }
  }

  function onMouseMove(event: MouseEvent): void {
    event.preventDefault();
    addPoint(config, current, event.pageX, event.pageY);
  }

  function onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    addPoint(config, current, event.touches[0].pageX, event.touches[0].pageY);
  }

  function onTouchEnd(): void {
    drawingTarget.removeEventListener("touchend", onTouchEnd);

    completeCurve(config, current);
  }

  function onMouseMoveDone(event: MouseEvent): void {
    drawingTarget.removeEventListener("mousemove", onMouseMove);
    drawingTarget.removeEventListener("mouseout", onMouseMoveDone);
    drawingTarget.removeEventListener("mouseup", onMouseMoveDone);

    addPoint(config, current, event.pageX, event.pageY);

    completeCurve(config, current);
  }

  return current;
}

function completeCurve(config: Config, current: Current): void {
  showUI();
  current.isDrawingCurve = false;

  const line = smoothLine(config, current);
  const curve = generateSmoothedBezierCurve(line, 0.3);
  config.onCurveDrawn(curve);
  current.points = [];
}

/**
 * Add point to to the current line.
 */
function addPoint(
  config: Config,
  current: Current,
  x: number,
  y: number
): void {
  const curr = { x, y };

  let prev;
  if (current.points.length > 0) {
    prev = current.points[current.points.length - 1];
  } else {
    prev = curr;
  }

  const distance = Math.sqrt(
    Math.pow(prev.x - curr.x, 2) + Math.pow(prev.y - curr.y, 2)
  );

  current.totalLineDistance += distance;
  current.points.push(curr);
  current.distancePerPoint.push(distance);
}

function smoothLine(config: Config, current: Current): Vec2[] {
  const { pointsPerDistance } = config;
  const { totalLineDistance, points, distancePerPoint } = current;
  const smoothPoints = [];
  let positionOnLinePiece = 0;
  let positionPrev = 0;
  let positionOnLine = 0;

  if (points.length <= 2) {
    return points;
  }

  let divisions = Math.ceil(totalLineDistance / pointsPerDistance);
  divisions = Math.max(2, divisions);
  const targetDistance = totalLineDistance / divisions;

  let i = 0;

  smoothPoints.push(points[0]); //Add the first point

  for (let j = 1; j < divisions; j++) {
    const distanceAtSegment = j * targetDistance;

    while (positionOnLine < distanceAtSegment) {
      i++;
      positionPrev = positionOnLine;
      positionOnLine += distancePerPoint[i];
    }

    positionOnLinePiece = positionOnLine - positionPrev;

    const theta = Math.atan2(
      points[i].y - points[i - 1].y,
      points[i].x - points[i - 1].x
    );

    smoothPoints.push({
      x: points[i - 1].x + positionOnLinePiece * Math.cos(theta),
      y: points[i - 1].y + positionOnLinePiece * Math.sin(theta),
    });
  }

  smoothPoints.push(points[points.length - 1]); // Add the last point

  return smoothPoints;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function generateSmoothedBezierCurve(line: Vec2[], smoothness: number) {
  let distance = 0;
  const distances = [];
  const cpLeft: Vec2[] = [];
  const cpRight: Vec2[] = [];

  // Generate distances
  for (let i = 1; i < line.length; i++) {
    const segmentDistance = Math.sqrt(
      Math.pow(line[i - 1].x - line[i].x, 2) +
        Math.pow(line[i - 1].y - line[i].y, 2)
    );
    distances.push(segmentDistance);
    distance += distance;
  }

  // Add a beginning control point.
  const firstPoint = line[0];
  cpLeft.push({ ...firstPoint });
  cpRight.push({ ...firstPoint });

  // Generate control points.
  for (let i = 1; i < line.length - 1; i++) {
    const p1 = line[i - 1];
    const p2 = line[i];
    const p3 = line[i + 1];

    const d1 = distances[i - 1];
    const d2 = distances[i];

    const theta = Math.atan2(p3.y - p1.y, p3.x - p1.x);

    cpLeft.push({
      x: p2.x + d1 * smoothness * Math.cos(theta + Math.PI),
      y: p2.y + d1 * smoothness * Math.sin(theta + Math.PI),
    });

    cpRight.push({
      x: p2.x + d2 * smoothness * Math.cos(theta),
      y: p2.y + d2 * smoothness * Math.sin(theta),
    });
  }

  // Add an ending control point
  const lastPoint = line[line.length - 1];
  cpLeft.push({ ...lastPoint });
  cpRight.push({ ...lastPoint });

  return {
    line,
    cpLeft,
    cpRight,
    smoothness,
    distance,
  };
}

export function drawLineSegments(
  ctx: CanvasRenderingContext2D,
  line: Vec2[]
): void {
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.strokeStyle = hslToFillStyle(0, 0, 0, 0.3);
  for (let i = 1; i < line.length; i++) {
    const prev = line[i - 1];
    const curr = line[i];

    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
  }
  ctx.stroke();
}

export function drawCurve(ctx: CanvasRenderingContext2D, curve: Curve): void {
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#fff";
  ctx.beginPath();
  ctx.lineCap = "round";

  const { line, cpRight, cpLeft } = curve;
  const firstPoint = line[0];
  ctx.moveTo(firstPoint.x, firstPoint.y);

  for (let i = 1; i < line.length; i++) {
    ctx.bezierCurveTo(
      cpRight[i - 1].x,
      cpRight[i - 1].y,
      cpLeft[i].x,
      cpLeft[i].y,
      line[i].x,
      line[i].y
    );
  }

  ctx.stroke();
}

export function drawControlPoints(
  ctx: CanvasRenderingContext2D,
  curve: Curve
): void {
  ctx.lineCap = "round";

  const { cpLeft, cpRight } = curve;
  for (let i = 0; i < cpLeft.length; i++) {
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(cpLeft[i].x, cpLeft[i].y);
    ctx.lineTo(cpRight[i].x, cpRight[i].y);
    ctx.strokeStyle = hslToFillStyle(135, 100, 25, 0.4);
    ctx.stroke();

    ctx.lineWidth = 50;

    ctx.beginPath();
    ctx.arc(cpLeft[i].x, cpLeft[i].y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = hslToFillStyle(90, 50, 50, 0.3);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cpRight[i].x, cpRight[i].y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = hslToFillStyle(180, 50, 50, 0.3);
    ctx.fill();
  }
}

function hslToFillStyle(h: number, s: number, l: number, a: number): string {
  if (a === undefined) {
    return ["hsl(", h, ",", s, "%,", l, "%)"].join("");
  }
  return ["hsla(", h, ",", s, "%,", l, "%,", a, ")"].join("");
}

function hideUI(): void {
  document.body.classList.add("hide-ui");
}

function showUI(): void {
  if (!(window as any).fullScreen) {
    document.body.classList.remove("hide-ui");
  }
}
