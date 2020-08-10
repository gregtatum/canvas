import { toBeDeepCloseTo, toMatchCloseTo } from "jest-matcher-deep-close-to";
expect.extend({ toBeDeepCloseTo, toMatchCloseTo });

import * as Physics from "..";

describe("PhysicsIntegrationIterator", () => {
  const floatPrecision = 9;
  const tick = 1 / 60;
  const halfTick = 0.5 / 60;

  it("can tick one step", () => {
    const iter = new Physics.IntegrationIterator(60, tick);
    expect([...iter]).toBeDeepCloseTo([tick], floatPrecision);
  });

  it("can tick a partial step", () => {
    const iter = new Physics.IntegrationIterator(60, halfTick);
    expect([...iter]).toBeDeepCloseTo([halfTick], floatPrecision);
  });

  it("can tick a many steps", () => {
    const iter = new Physics.IntegrationIterator(60, 2.5 * tick);
    expect([...iter]).toBeDeepCloseTo([tick, tick, halfTick], floatPrecision);
  });
});

describe("intersect", () => {
  describe("point to sphere", () => {
    function checkIntersection(opts: {
      point: Vec2;
      sphere: Vec2;
      radius: number;
    }): boolean {
      const point = Physics.create.point(opts.point);
      const sphere = Physics.create.sphere(opts.sphere, opts.radius);
      return Physics.intersect.point.sphere(point, sphere);
    }

    it("returns false for a variety of checks", () => {
      expect(
        checkIntersection({
          point: { x: 0, y: 0 },
          sphere: { x: 1, y: 0 },
          radius: 0.25,
        })
      ).toBe(false);

      expect(
        checkIntersection({
          point: { x: 0, y: 1 },
          sphere: { x: 0, y: 0 },
          radius: 0.25,
        })
      ).toBe(false);
    });

    it("returns true for a variety of checks", () => {
      expect(
        checkIntersection({
          point: { x: 0, y: 0 },
          sphere: { x: 1, y: 0 },
          radius: 1,
        })
      ).toBe(true);

      expect(
        checkIntersection({
          point: { x: 0, y: 1 },
          sphere: { x: 0, y: 0 },
          radius: 1,
        })
      ).toBe(true);

      expect(
        checkIntersection({
          point: { x: 0.5, y: 0 },
          sphere: { x: 0, y: 0 },
          radius: 1,
        })
      ).toBe(true);
    });
  });

  describe("box to sphere", () => {
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    function setup(box: Physics.Box, sphere: Physics.Sphere) {
      const stage = new Stage(10);
      function draw(): string[] {
        stage.clear();
        stage.drawBox("X", box);
        stage.drawSphere(".", sphere);
        return stage.output();
      }
      return { draw };
    }

    it("does not intersect", function() {
      const box = Physics.create.box({ x: -3, y: 0 }, 3, 4);
      const sphere = Physics.create.sphere({ x: 2, y: 0 }, 2);
      const { draw } = setup(box, sphere);
      expect(draw()).toMatchInlineSnapshot(`
        Array [
          "                              ",
          "                              ",
          "                              ",
          "    X  X  X           .       ",
          "    X  X  X        .  .  .    ",
          "    X  X  X     .  .  .  .  . ",
          "    X  X  X        .  .  .    ",
          "    X  X  X           .       ",
          "                              ",
          "                              ",
        ]
      `);
      expect(Physics.intersect.box.sphere(box, sphere)).toEqual(false);
    });

    it("intersects when the sphere is over the box", function() {
      const box = Physics.create.box({ x: -3, y: 0 }, 3, 4);
      const sphere = Physics.create.sphere({ x: 0, y: 0 }, 2);
      const { draw } = setup(box, sphere);
      expect(draw()).toMatchInlineSnapshot(`
        Array [
          "                              ",
          "                              ",
          "                              ",
          "    X  X  X     .             ",
          "    X  X  X  .  .  .          ",
          "    X  X  .  .  .  .  .       ",
          "    X  X  X  .  .  .          ",
          "    X  X  X     .             ",
          "                              ",
          "                              ",
        ]
      `);
      expect(Physics.intersect.box.sphere(box, sphere)).toEqual(true);
    });

    it("does not intersect even when the bounding boxes do", function() {
      const box = Physics.create.box({ x: -3, y: -2 }, 3, 4);
      const sphere = Physics.create.sphere({ x: 0, y: 2 }, 2);
      const { draw } = setup(box, sphere);
      expect(draw()).toMatchInlineSnapshot(`
        Array [
          "                              ",
          "    X  X  X                   ",
          "    X  X  X                   ",
          "    X  X  X                   ",
          "    X  X  X                   ",
          "    X  X  X     .             ",
          "             .  .  .          ",
          "          .  .  .  .  .       ",
          "             .  .  .          ",
          "                .             ",
        ]
      `);
      expect(Physics.intersect.box.sphere(box, sphere)).toEqual(false);
    });
  });

  describe("check intersections", () => {
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    function checkIntersections(entities: Array<Physics.Entity>) {
      const world = Physics.create.world();
      for (const entity of entities) {
        world.addToAllGroup(entity);
      }
      const results = [];
      for (const [a, b] of world.gcHeavyCheckAllIntersections()) {
        results.push(
          `${a.type}(id:${a.body.id}) intersects ${b.type}(id:${b.body.id})`
        );
      }
      return results;
    }

    it("finds intersections for a point and sphere", () => {
      const intersections = checkIntersections([
        Physics.create.point({ x: 0, y: 0 }),
        Physics.create.sphere({ x: 0, y: 0 }, 1),
      ]);
      expect(intersections).toEqual(["point(id:0) intersects sphere(id:1)"]);
    });

    it("finds intersections for a sphere and point and doesn't report double intersections", () => {
      const intersections = checkIntersections([
        Physics.create.sphere({ x: 0, y: 0 }, 1),
        Physics.create.point({ x: 0, y: 0 }),
      ]);
      expect(intersections).toEqual(["sphere(id:0) intersects point(id:1)"]);
    });

    it("finds intersections for a point and sphere", () => {
      const intersections = checkIntersections([
        Physics.create.sphere({ x: 0, y: 0 }, 1),
        Physics.create.point({ x: 0, y: 0 }),
        // These don't match
        Physics.create.point({ x: 3, y: 0 }),
        Physics.create.point({ x: 4, y: 0 }),
        Physics.create.point({ x: 0, y: 3 }),
        Physics.create.point({ x: 0, y: 4 }),
      ]);
      expect(intersections).toEqual(["sphere(id:0) intersects point(id:1)"]);
    });
  });
});

describe("intersectRaySphere", () => {
  it("draws a sphere", function() {
    const stage = new Stage(10);
    stage.drawSphere("S", Physics.create.sphere({ x: 0, y: 0 }, 4));
    expect(stage.output()).toMatchInlineSnapshot(`
      Array [
        "                              ",
        "                S             ",
        "          S  S  S  S  S       ",
        "       S  S  S  S  S  S  S    ",
        "       S  S  S  S  S  S  S    ",
        "    S  S  S  S  S  S  S  S  S ",
        "       S  S  S  S  S  S  S    ",
        "       S  S  S  S  S  S  S    ",
        "          S  S  S  S  S       ",
        "                S             ",
      ]
    `);
  });

  it("intersects coming from the bottom right", function() {
    const stage = new Stage(12);
    const point = Physics.create.point({ x: 5, y: 5 });
    const sphere = Physics.create.sphere({ x: 0, y: 0 }, 4);
    const ray = Physics.vec2.normalize({
      x: -1,
      y: -1,
    });
    const intersection = Physics.intersectRaySphere(
      point.body.position,
      ray,
      sphere
    );
    stage.drawSphere(".", sphere);
    stage.drawPoint("↖", point);
    stage.drawPoint("0", Physics.create.point(intersection));

    expect(stage.output()).toMatchInlineSnapshot(`
      Array [
        "                                    ",
        "                                    ",
        "                   .                ",
        "             .  .  .  .  .          ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "       .  .  .  .  .  .  .  .  .    ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "             .  .  .  .  .  0       ",
        "                   .                ",
        "                                  ↖ ",
      ]
    `);
  });

  it("intersects coming from the bottom right, but shifted left a bit", function() {
    const stage = new Stage(12);
    const point = Physics.create.point({ x: 5, y: 5 });
    const sphere = Physics.create.sphere({ x: 0, y: 0 }, 4);
    const ray = Physics.vec2.normalize({
      x: -1,
      y: -0.25,
    });
    const intersection = Physics.intersectRaySphere(
      point.body.position,
      ray,
      sphere
    );
    stage.drawSphere(".", sphere);
    stage.drawPoint("↖", point);
    stage.drawPoint("0", Physics.create.point(intersection));

    expect(stage.output()).toMatchInlineSnapshot(`
      Array [
        "                                    ",
        "                                    ",
        "                   .                ",
        "             .  .  .  .  .          ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "       .  .  .  .  .  .  .  .  .    ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "             .  .  .  .  .          ",
        "                   .  0             ",
        "                                  ↖ ",
      ]
    `);
  });

  it("intersects coming from the bottom right, but shifted right a bit", function() {
    const stage = new Stage(12);
    const point = Physics.create.point({ x: 5, y: 5 });
    const sphere = Physics.create.sphere({ x: 0, y: 0 }, 4);
    const ray = Physics.vec2.normalize({
      x: -0.25,
      y: -1,
    });
    const intersection = Physics.intersectRaySphere(
      point.body.position,
      ray,
      sphere
    );
    stage.drawSphere(".", sphere);
    stage.drawPoint("↖", point);
    stage.drawPoint("0", Physics.create.point(intersection));

    expect(stage.output()).toMatchInlineSnapshot(`
      Array [
        "                                    ",
        "                                    ",
        "                   .                ",
        "             .  .  .  .  .          ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "       .  .  .  .  .  .  .  .  .    ",
        "          .  .  .  .  .  .  .  0    ",
        "          .  .  .  .  .  .  .       ",
        "             .  .  .  .  .          ",
        "                   .                ",
        "                                  ↖ ",
      ]
    `);
  });

  it("errors when the ray misses the sphere", function() {
    const stage = new Stage(12);
    const point = Physics.create.point({ x: 5, y: 5 });
    const sphere = Physics.create.sphere({ x: 0, y: 0 }, 4);
    const ray = Physics.vec2.normalize({
      x: 0,
      y: -1,
    });
    stage.drawSphere(".", sphere);
    stage.drawPoint("↑", point);

    expect(stage.output()).toMatchInlineSnapshot(`
      Array [
        "                                    ",
        "                                    ",
        "                   .                ",
        "             .  .  .  .  .          ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "       .  .  .  .  .  .  .  .  .    ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "             .  .  .  .  .          ",
        "                   .                ",
        "                                  ↑ ",
      ]
    `);

    expect(() => {
      Physics.intersectRaySphere(point.body.position, ray, sphere);
    }).toThrow();
  });
});

class Stage {
  data: string[][];
  size: number;

  constructor(size: number) {
    const data: string[][] = [];
    for (let i = 0; i < size; i++) {
      data.push([]);
      for (let j = 0; j < size; j++) {
        data[i][j] = "   ";
      }
    }
    this.data = data;
    this.size = size;
  }

  drawSphere(character: string, sphere: Physics.Sphere): void {
    const point = Physics.create.point({ x: 0, y: 0 });
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        point.body.position.x = i - this.size / 2;
        point.body.position.y = j - this.size / 2;
        if (Physics.intersect.sphere.point(sphere, point)) {
          this.data[j][i] = ` ${character} `;
        }
      }
    }
  }

  drawBox(character: string, box: Physics.Box): void {
    const point = Physics.create.point({ x: 0, y: 0 });
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        point.body.position.x = i - this.size / 2;
        point.body.position.y = j - this.size / 2;
        if (Physics.intersect.box.point(box, point)) {
          this.data[j][i] = ` ${character} `;
        }
      }
    }
  }

  drawPoint(character: string, point: Physics.Point): void {
    const x = Math.round(point.body.position.x + this.size / 2);
    const y = Math.round(point.body.position.y + this.size / 2);
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) {
      console.error(this.output(), point);
      throw new Error(
        "The point is outside of the stage range and won't be drawn."
      );
    }
    this.data[y][x] = ` ${character} `;
  }

  // Output so that it's nice for a test assertion.
  output(): string[] {
    return this.data.map(row => row.join(""));
  }

  clear(): void {
    for (const row of this.data) {
      for (let i = 0; i < row.length; i++) {
        row[i] = "   ";
      }
    }
  }
}

describe("collisions between point and sphere", function() {
  it("intersects coming from the bottom right", function() {
    const stage = new Stage(12);
    const point = Physics.create.point({ x: 5, y: 5 });
    const sphere = Physics.create.sphere({ x: 0, y: 0 }, 4);

    point.body.velocity.x = -1;
    point.body.velocity.y = -1;

    function draw(): string[] {
      stage.clear();
      stage.drawSphere(".", sphere);
      stage.drawPoint(getArrow(point.body.velocity), point);
      return stage.output();
    }

    const world = Physics.create.world();
    world.ticksPerSecond = 1;
    world.addToAllGroup(point);
    world.addToAllGroup(sphere);

    expect(draw()).toMatchInlineSnapshot(`
      Array [
        "                                    ",
        "                                    ",
        "                   .                ",
        "             .  .  .  .  .          ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "       .  .  .  .  .  .  .  .  .    ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "             .  .  .  .  .          ",
        "                   .                ",
        "                                  ↖ ",
      ]
    `);

    world.integrate(1);

    expect(draw()).toMatchInlineSnapshot(`
      Array [
        "                                    ",
        "                                    ",
        "                   .                ",
        "             .  .  .  .  .          ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "       .  .  .  .  .  .  .  .  .    ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "             .  .  .  .  .          ",
        "                   .           ↖    ",
        "                                    ",
      ]
    `);

    world.integrate(1);

    expect(draw()).toMatchInlineSnapshot(`
      Array [
        "                                    ",
        "                                    ",
        "                   .                ",
        "             .  .  .  .  .          ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "       .  .  .  .  .  .  .  .  .    ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "             .  .  .  .  .  ↖       ",
        "                   .                ",
        "                                    ",
      ]
    `);

    world.integrate(1);

    expect(draw()).toMatchInlineSnapshot(`
      Array [
        "                                    ",
        "                                    ",
        "                   .                ",
        "             .  .  .  .  .          ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "       .  .  .  .  .  .  .  .  .    ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "             .  .  .  .  .          ",
        "                   .           ↘    ",
        "                                    ",
      ]
    `);

    world.integrate(1);

    expect(draw()).toMatchInlineSnapshot(`
      Array [
        "                                    ",
        "                                    ",
        "                   .                ",
        "             .  .  .  .  .          ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "       .  .  .  .  .  .  .  .  .    ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "             .  .  .  .  .          ",
        "                   .                ",
        "                                  ↘ ",
      ]
    `);
  });

  it("intersects coming from the bottom right at more of an angle", function() {
    const stage = new Stage(12);
    const point = Physics.create.point({ x: 5, y: 5 });
    const sphere = Physics.create.sphere({ x: 0, y: -3 }, 4);

    point.body.velocity.x = -1;
    point.body.velocity.y = -1;

    function draw(): string[] {
      stage.clear();
      stage.drawSphere(".", sphere);
      stage.drawPoint(getArrow(point.body.velocity), point);
      return stage.output();
    }

    const world = Physics.create.world();
    world.ticksPerSecond = 1;
    world.addToAllGroup(point);
    world.addToAllGroup(sphere);

    expect(draw()).toMatchInlineSnapshot(`
      Array [
        "             .  .  .  .  .          ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "       .  .  .  .  .  .  .  .  .    ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "             .  .  .  .  .          ",
        "                   .                ",
        "                                    ",
        "                                    ",
        "                                    ",
        "                                  ↖ ",
      ]
    `);
    world.integrate(3);

    expect(draw()).toMatchInlineSnapshot(`
      Array [
        "             .  .  .  .  .          ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "       .  .  .  .  .  .  .  .  .    ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "             .  .  .  .  .          ",
        "                   .                ",
        "                         ↖          ",
        "                                    ",
        "                                    ",
        "                                    ",
      ]
    `);

    world.integrate(3);

    expect(draw()).toMatchInlineSnapshot(`
      Array [
        "             .  .  .  .  .          ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "       .  .  .  .  .  .  .  .  .    ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "             .  .  .  .  .          ",
        "                   .                ",
        "                   ↓                ",
        "                                    ",
        "                                    ",
        "                                    ",
      ]
    `);

    world.integrate(2);

    expect(draw()).toMatchInlineSnapshot(`
      Array [
        "             .  .  .  .  .          ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "       .  .  .  .  .  .  .  .  .    ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "             .  .  .  .  .          ",
        "                   .                ",
        "                                    ",
        "                                    ",
        "                ↓                   ",
        "                                    ",
      ]
    `);
  });

  it("handles points that are inside of spheres on their way in", function() {
    const stage = new Stage(12);
    const point = Physics.create.point({ x: 1, y: 1 });
    const sphere = Physics.create.sphere({ x: 0, y: 0 }, 4);

    point.body.velocity.x = -1;
    point.body.velocity.y = -1;

    function draw(): string[] {
      stage.clear();
      stage.drawSphere(".", sphere);
      stage.drawPoint(getArrow(point.body.velocity), point);
      return stage.output();
    }

    const world = Physics.create.world();
    world.ticksPerSecond = 1;
    world.addToAllGroup(point);
    world.addToAllGroup(sphere);

    expect(draw()).toMatchInlineSnapshot(`
      Array [
        "                                    ",
        "                                    ",
        "                   .                ",
        "             .  .  .  .  .          ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "       .  .  .  .  .  .  .  .  .    ",
        "          .  .  .  .  ↖  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "             .  .  .  .  .          ",
        "                   .                ",
        "                                    ",
      ]
    `);

    world.integrate(1);

    expect(draw()).toMatchInlineSnapshot(`
      Array [
        "                                    ",
        "                                    ",
        "                   .                ",
        "             .  .  .  .  .          ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "       .  .  .  .  .  .  .  .  .    ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "             .  .  .  .  .  ↘       ",
        "                   .                ",
        "                                    ",
      ]
    `);

    world.integrate(1);

    expect(draw()).toMatchInlineSnapshot(`
      Array [
        "                                    ",
        "                                    ",
        "                   .                ",
        "             .  .  .  .  .          ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "       .  .  .  .  .  .  .  .  .    ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "             .  .  .  .  .          ",
        "                   .           ↘    ",
        "                                    ",
      ]
    `);
  });

  it("handles points that are inside of spheres on their way out", function() {
    const stage = new Stage(12);
    const point = Physics.create.point({ x: 2, y: 2 });
    const sphere = Physics.create.sphere({ x: 0, y: 0 }, 4);

    point.body.velocity.x = 1;
    point.body.velocity.y = 1;

    function draw(): string[] {
      stage.clear();
      stage.drawSphere(".", sphere);
      stage.drawPoint(getArrow(point.body.velocity), point);
      return stage.output();
    }

    const world = Physics.create.world();
    world.ticksPerSecond = 1;
    world.addToAllGroup(point);
    world.addToAllGroup(sphere);

    expect(draw()).toMatchInlineSnapshot(`
      Array [
        "                                    ",
        "                                    ",
        "                   .                ",
        "             .  .  .  .  .          ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "       .  .  .  .  .  .  .  .  .    ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  ↘  .       ",
        "             .  .  .  .  .          ",
        "                   .                ",
        "                                    ",
      ]
    `);

    world.integrate(1);

    expect(draw()).toMatchInlineSnapshot(`
      Array [
        "                                    ",
        "                                    ",
        "                   .                ",
        "             .  .  .  .  .          ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "       .  .  .  .  .  .  .  .  .    ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "             .  .  .  .  .  ↘       ",
        "                   .                ",
        "                                    ",
      ]
    `);

    world.integrate(1);

    expect(draw()).toMatchInlineSnapshot(`
      Array [
        "                                    ",
        "                                    ",
        "                   .                ",
        "             .  .  .  .  .          ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "       .  .  .  .  .  .  .  .  .    ",
        "          .  .  .  .  .  .  .       ",
        "          .  .  .  .  .  .  .       ",
        "             .  .  .  .  .          ",
        "                   .           ↘    ",
        "                                    ",
      ]
    `);
  });
});

function getArrow(vec: Vec2): string {
  const tau = Math.PI * 2;
  const theta = (tau + Math.atan2(vec.y, vec.x)) % tau;
  //5  6  7
  //4     0
  //3  2  1
  switch (Math.round((theta / tau) * 8) % 8) {
    case 0:
      return "→";
    case 1:
      return "↘";
    case 2:
      return "↓";
    case 3:
      return "↙";
    case 4:
      return "←";
    case 5:
      return "↖";
    case 6:
      return "↑";
    case 7:
      return "↗";
    default:
      throw new Error("Unable to convert a vector to an arrow.");
  }
}
