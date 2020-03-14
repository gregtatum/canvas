class CurveDrawingLayer {
  constructor(config) {
    this.config = config;

    this.current = {
      points: [],
      distancePerPoint: [],
      isDrawingCurve: false,
      totalLineDistance: 0,
    };

    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseMoveDone = this.onMouseMoveDone.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);

    config.drawingTarget.addEventListener("mousedown", this.onMouseDown);
    config.drawingTarget.addEventListener("touchmove", this.onTouchMove);
    config.drawingTarget.addEventListener("touchstart", this.onTouchStart);
  }

  onTouchStart(event) {
    event.preventDefault();

    if (this.current.isDrawingCurve === false) {
      this.config.drawingTarget.addEventListener("touchend", this.onTouchEnd);

      hideUI();

      this.current.isDrawingCurve = true;
      this.current.points = [];
      this.current.distancePerPoint = [];
      this.current.totalLineDistance = 0;

      const [{ pageX, pageY }] = event.touches[0];
      this.addPoint(pageX, pageY);
    }
  }

  onMouseDown(event) {
    if (this.current.isDrawingCurve === false) {
      this.config.drawingTarget.addEventListener("mousemove", this.onMouseMove);
      this.config.drawingTarget.addEventListener(
        "mouseout",
        this.onMouseMoveDone
      );
      this.config.drawingTarget.addEventListener(
        "mouseup",
        this.onMouseMoveDone
      );

      hideUI();

      this.current.isDrawingCurve = true;
      this.current.points = [];
      this.current.distancePerPoint = [];
      this.current.totalLineDistance = 0;

      this.addPoint(event.pageX, event.pageY);
    }
  }

  onMouseMove(event) {
    event.preventDefault();
    this.addPoint(event.pageX, event.pageY);
  }

  onTouchMove(event) {
    event.preventDefault();
    this.addPoint(event.touches[0].pageX, event.touches[0].pageY);
  }

  onTouchEnd() {
    this.config.drawingTarget.removeEventListener("touchend", this.onTouchEnd);

    this.endInteractionAndDrawTree();
  }

  onMouseMoveDone(event) {
    this.config.drawingTarget.removeEventListener(
      "mousemove",
      this.onMouseMove
    );
    this.config.drawingTarget.removeEventListener(
      "mouseout",
      this.onMouseMoveDone
    );
    this.config.drawingTarget.removeEventListener(
      "mouseup",
      this.onMouseMoveDone
    );

    this.addPoint(event.pageX, event.pageY);

    this.endInteractionAndDrawTree();
  }

  endInteractionAndDrawTree() {
    showUI();
    this.current.isDrawingCurve = false;

    const line = smoothLine(this.config, this.current);
    const curve = generateSmoothedBezierCurve(line, 0.3);

    this.config.onCurveDrawn(curve);
  }

  addPoint(x, y) {
    x *= window.devicePixelRatio;
    y *= window.devicePixelRatio;

    const curr = [x, y];

    let prev;
    if (this.current.points.length > 0) {
      prev = this.current.points[this.current.points.length - 1];
    } else {
      prev = curr;
    }

    const distance = Math.sqrt(
      Math.pow(prev[0] - curr[0], 2) + Math.pow(prev[1] - curr[1], 2)
    );
    this.current.totalLineDistance += distance;

    this.current.points.push(curr);
    this.current.distancePerPoint.push(distance);

    if (this.config.doDrawTrail) {
      drawSingleLine(this.config.ctx, prev, curr);
    }
  }
}

function smoothLine(config, current) {
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
      points[i][1] - points[i - 1][1],
      points[i][0] - points[i - 1][0]
    );

    smoothPoints.push([
      points[i - 1][0] + positionOnLinePiece * Math.cos(theta),
      points[i - 1][1] + positionOnLinePiece * Math.sin(theta),
    ]);
  }

  smoothPoints.push(points[points.length - 1]); // Add the last point

  return smoothPoints;
}

function generateSmoothedBezierCurve(line, smoothness) {
  let distance = 0;
  const distances = [];
  const cpLeft = [];
  const cpRight = [];

  // Generate distances
  for (let i = 1; i < line.length; i++) {
    const segmentDistance = Math.sqrt(
      Math.pow(line[i - 1][0] - line[i][0], 2) +
        Math.pow(line[i - 1][1] - line[i][1], 2)
    );
    distances.push(segmentDistance);
    distance += distance;
  }

  // Add a beginning control point.
  const firstPoint = line[0];
  cpLeft.push(firstPoint.slice());
  cpRight.push(firstPoint.slice());

  // Generate control points.
  for (let i = 1; i < line.length - 1; i++) {
    const p1 = line[i - 1];
    const p2 = line[i];
    const p3 = line[i + 1];

    const d1 = distances[i - 1];
    const d2 = distances[i];

    const theta = Math.atan2(p3[1] - p1[1], p3[0] - p1[0]);

    cpLeft.push([
      p2[0] + d1 * smoothness * Math.cos(theta + Math.PI),
      p2[1] + d1 * smoothness * Math.sin(theta + Math.PI),
    ]);

    cpRight.push([
      p2[0] + d2 * smoothness * Math.cos(theta),
      p2[1] + d2 * smoothness * Math.sin(theta),
    ]);
  }

  // Add an ending control point
  const lastPoint = line[line.length - 1];
  cpLeft.push(lastPoint.slice());
  cpRight.push(lastPoint.slice());

  return {
    line,
    cpLeft,
    cpRight,
    smoothness,
    distance,
  };
}

function drawLineSegments(ctx, line) {
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.strokeStyle = hslToFillStyle(0, 0, 0, 0.3);
  for (let i = 1; i < line.length; i++) {
    const prev = line[i - 1];
    const curr = line[i];

    ctx.moveTo(prev[0], prev[1]);
    ctx.lineTo(curr[0], curr[1]);
  }
  ctx.stroke();
}

function drawCurve(ctx, curve) {
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#fff";
  ctx.beginPath();
  ctx.lineCap = "round";

  const { line, cpRight, cpLeft } = curve;
  const firstPoint = line[0];
  ctx.moveTo(firstPoint[0], firstPoint[1]);

  for (let i = 1; i < line.length; i++) {
    ctx.bezierCurveTo(
      cpRight[i - 1][0],
      cpRight[i - 1][1],
      cpLeft[i][0],
      cpLeft[i][1],
      line[i][0],
      line[i][1]
    );
  }

  ctx.stroke();
}

function drawControlPoints(ctx, curve) {
  ctx.lineCap = "round";

  const { cpLeft, cpRight } = curve;
  for (let i = 0; i < cpLeft.length; i++) {
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(cpLeft[i][0], cpLeft[i][1]);
    ctx.lineTo(cpRight[i][0], cpRight[i][1]);
    ctx.strokeStyle = hslToFillStyle(135, 100, 25, 0.4);
    ctx.stroke();

    ctx.lineWidth = 50;

    ctx.beginPath();
    ctx.arc(cpLeft[i][0], cpLeft[i][1], 5, 0, 2 * Math.PI);
    ctx.fillStyle = hslToFillStyle(90, 50, 50, 0.3);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cpRight[i][0], cpRight[i][1], 5, 0, 2 * Math.PI);
    ctx.fillStyle = hslToFillStyle(180, 50, 50, 0.3);
    ctx.fill();
  }
}

function drawSingleLine(ctx, pointA, pointB) {
  ctx.lineWidth = 15 * window.devicePixelRatio;
  ctx.strokeStyle = "#333";
  ctx.beginPath();
  ctx.lineCap = "round";
  ctx.moveTo(pointA[0], pointA[1]);
  ctx.lineTo(pointB[0], pointB[1]);
  ctx.stroke();
}

function hslToFillStyle(h, s, l, a) {
  if (a === undefined) {
    return ["hsl(", h, ",", s, "%,", l, "%)"].join("");
  }
  return ["hsla(", h, ",", s, "%,", l, "%,", a, ")"].join("");
}

function hideUI() {
  document.body.classList.add("hide-ui");
}

function showUI() {
  if (!window.fullScreen) {
    document.body.classList.remove("hide-ui");
  }
}

module.exports = {
  CurveDrawingLayer,
  drawControlPoints,
  drawCurve,
  drawLineSegments,
};
