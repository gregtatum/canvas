const Rbush = require("rbush");
const Simplex = require("simplex-noise");
const Lerp = require("lerp");
const Random = require("@tatumcreative/random");
const Intersection = require("../lib/intersection");
const Draw = require("../lib/draw");
const Shortcuts = require("../lib/shortcuts");

function _cutOutIntersections(neighbors, bounds) {
  let lineEnd;
  let lastDistance = Infinity;

  const a = bounds.line;

  neighbors.forEach(function(neighbor) {
    const b = neighbor.line;

    const intersection = Intersection(
      a[0],
      a[1],
      a[2],
      a[3],
      b[0],
      b[1],
      b[2],
      b[3]
    );
    if (intersection) {
      const intersectionDistance =
        (intersection[0] - a[0]) * (intersection[0] - a[0]) +
        (intersection[1] - a[1]) * (intersection[1] - a[1]);
      if (intersectionDistance < lastDistance) {
        lastDistance = intersectionDistance;
        lineEnd = intersection;
      }
    }
  });

  if (lineEnd) {
    return _lineToBounds([a[0], a[1], lineEnd[0], lineEnd[1]]);
  }

  return false;
}

function _lineToBounds(line) {
  const bounds = [
    Math.min(line[0], line[2]),
    Math.min(line[1], line[3]),
    Math.max(line[0], line[2]),
    Math.max(line[1], line[3])
  ];

  bounds.line = line;
  bounds.theta = Math.atan2(line[3] - line[1], line[2] - line[0]);
  return bounds;
}

function _newLine(current, config, x, y, prevTheta, generation, now) {
  const noise = config.simplex3(
    x * config.simplexScale,
    y * config.simplexScale,
    now * config.simplexDepthScale
  );

  const theta =
    config.spinSpeed * Math.sin(now * config.spinChangeSpeed) +
    prevTheta -
    (noise - noise * 0.5) * config.turnSpeed;

  const newX = x + Math.cos(theta) * config.lineLength;
  const newY = y + Math.sin(theta) * config.lineLength;

  let newBounds = _lineToBounds([x, y, newX, newY]);
  const neighbors = current.tree.search(newBounds);

  const cutBounds = _cutOutIntersections(neighbors, newBounds);

  if (cutBounds) {
    newBounds = cutBounds;
  }
  newBounds.line.generation = generation;
  current.tree.insert(newBounds);
  current.lines.push(newBounds.line);
  current.newLines.push(newBounds.line);

  if (!cutBounds) {
    return newBounds;
  }
  return undefined;
}

function _createStageBoundary(config, current) {
  const centerX = 0.5;
  const centerY = 0.5;

  const size = config.margin * 0.5;

  const x1 = centerX - size;
  const x2 = centerX + size;
  const y1 = centerY - size;
  const y2 = centerY + size;

  // current.tree.insert( _lineToBounds([x1,y1,x2,y1]) )
  // current.tree.insert( _lineToBounds([x2,y1,x2,y2]) )
  // current.tree.insert( _lineToBounds([x2,y2,x1,y2]) )
  // current.tree.insert( _lineToBounds([x1,y2,x1,y1]) )

  current.stageBoundary = [
    Lerp(centerX, x1, 0.5),
    Lerp(centerY, y1, 0.5),
    Lerp(centerX, x2, 0.5),
    Lerp(centerY, y2, 0.5)
  ];
}

function _createInitialLine(current, config) {
  const generation = Math.log(current.generation++);
  const iteration = 0;
  const theta = 0;

  current.active[0] = _newLine(
    current,
    config,
    0.5,
    0.5,
    theta,
    generation,
    iteration
  );
}

function _updateLines(current, config) {
  const active = current.active;
  const newBranches = [];
  current.iteration++;
  current.newLines.length = 0;

  let i = 0;
  for (; i < config.maxLines && i < active.length; i++) {
    const index = (current.activeIndex + i) % active.length;
    const bounds = active[index];

    if (bounds) {
      const x = bounds.line[2];
      const y = bounds.line[3];
      const generation = bounds.generation;

      if (config.random() < config.chanceToBranch) {
        newBranches.push(_startBranch(current, config, bounds.line));
      }

      active[index] = _newLine(
        current,
        config,
        x,
        y,
        bounds.theta,
        generation,
        current.iteration
      );
    } else {
      // Remove any dead lines
      active.splice(index, 1);
      i--;
    }
  }
  current.active = active.concat(newBranches);
  current.activeIndex = i % active.length;
  current.firstRun = false;
}

function _startBranch(current, config, line) {
  const dx = (line[2] - line[0]) * config.nubSize;
  const dy = (line[3] - line[1]) * config.nubSize;

  // Choose either or side
  const normal = config.random() > 0.5 ? [-dy, dx] : [dy, -dx];

  const x = (line[0] + line[2]) / 2;
  const y = (line[1] + line[3]) / 2;

  const bounds = _lineToBounds([
    x + normal[0] * 0.5,
    y + normal[1] * 0.5,
    x + normal[0],
    y + normal[1]
  ]);

  bounds.line.generation = Math.pow(line.generation || 2, 2);

  current.tree.insert(bounds);
  current.lines.push(bounds.line);
  current.active.push(bounds);
  current.newLines.push(bounds.line);

  return bounds;
}

function init() {
  const seed =
    window.location.hash.substr(1) || String(Math.random()).split(".")[1];
  const random = Random(seed);
  const simplex = new Simplex(random);
  const simplex3 = simplex.noise3D.bind(simplex);

  Shortcuts(seed);
  console.log("current seed", seed);

  const config = {
    margin: 1.5,
    maxLines: 200,
    random: random,
    simplex3: simplex3,
    lineLength: 0.002,
    simplexScale: 1,
    simplexDepthScale: 0.0001,
    nubSize: 0.001,
    chanceToBranch: 0.1,
    turnSpeed: Math.PI * 0.01,
    spinSpeed: 0.1,
    spinChangeSpeed: 0.01
  };

  const current = {
    firstRun: true,
    tree: Rbush(9),
    active: [],
    activeIndex: 0,
    lines: [],
    newLines: [],
    stageBoundary: null,
    generation: 2,
    iteration: 0
  };

  _createStageBoundary(config, current);
  _createInitialLine(current, config);
  const draw = Draw(current);

  function loop() {
    _updateLines(current, config);
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.onhashchange = function() {
    location.reload();
  };
}

init();
