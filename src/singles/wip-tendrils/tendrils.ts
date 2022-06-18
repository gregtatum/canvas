import { quadtree, Quadtree } from "d3-quadtree";
import Simplex from "simplex-noise";
import * as Quads from "lib/quads";
import { DefaultContext, Regl } from "lib/regl";
import { createWithModel, ModelContext } from "lib/draw/with-model";
import { mat4, vec3 } from "lib/vec-math";
import { accessors, drawCommand, glsl } from "lib/regl-helpers";
import setupRandom from "@tatumcreative/random";

export function createTendrils(regl: Regl, seed: string, overrides: Partial<Overrides> = {}) {
  const tendrilsMesh = createTendrilsMesh(seed);
  return {
    tendrilsMesh,
    drawTendrils: createDrawTendrils(regl, tendrilsMesh, overrides),
    withTendrilsModel: createWithTendrilsModel(regl),
  };
}

type Simplex2 = (x: number, y: number) => number;

function computeCurl(simplex2: (x: number, y: number) => number, x: number, y: number): Tuple2 {
  const eps = 0.0001;

  //Find rate of change in X direction
  const na1 = simplex2(x + eps, y);
  const na2 = simplex2(x - eps, y);

  //Average to find approximate derivative
  const a = (na1 - na2)/(2 * eps);

  //Find rate of change in Y direction
  const nb1 = simplex2(x, y + eps);
  const nb2 = simplex2(x, y - eps);

  //Average to find approximate derivative
  const b = (nb1 - nb2)/(2 * eps);

  //Curl
  return [b, -a];
}

function getExtrudeState(seed: string, mesh: QuadMesh) {
  const random = setupRandom(seed);
  const simplex = new Simplex(random);
  const simplex2 = simplex.noise2D.bind(simplex);

  return {
    mesh,
    simplex2,
    random,
    quadtree: quadtree<QuadTreeNode>()
      .x(d => d.x)
      .y(d => d.y),
    wanderOffset: Math.PI * 0.25,
    wanderPeriod: 5,
    iterationsThetaLeadIn: 0.4,
  }
}

interface QuadTreeNode {
  x: number,
  y: number,
  quadIndex: QuadIndex,
}

function addToQuadTree(quadtree: Quadtree<QuadTreeNode>, mesh: QuadMesh, quadIndex: QuadIndex) {
  const quad = mesh.quads[quadIndex];
  const a = mesh.positions[quad[0]];
  const b = mesh.positions[quad[1]];
  const c = mesh.positions[quad[2]];
  const d = mesh.positions[quad[3]];
  const x = (a[0] + b[0] + c[0] + d[0]) / 4;
  const y = (a[1] + b[1] + c[1] + d[1]) / 4;
  quadtree.add({ x, y, quadIndex })
}

type ExtrudeState = ReturnType<typeof getExtrudeState>;

function createTendrilsMesh(seed: string): QuadMesh {

  const { mesh, quad } = Quads.createQuad({ w: 0.01, h: 0.01, facing: "z-" });
  const edgeL: Edge = [quad[0], quad[1]];
  const edgeR: Edge = [quad[2], quad[3]];
  const edgeT: Edge = [quad[1], quad[2]];
  const edgeD: Edge = [quad[3], quad[0]];
  const state = getExtrudeState(seed, mesh);
  addToQuadTree(state.quadtree, mesh, 0);

  extrude(state, quad, edgeL, edgeR, 100);
  extrude(state, quad, edgeR, edgeL, 100);
  extrude(state, quad, edgeT, edgeD, 100);
  extrude(state, quad, edgeD, edgeT, 100);

  return mesh;
}

function getEdgeCenter(mesh: QuadMesh, [a, b]: Edge, result: Tuple3  = vec3.create()): Tuple3 {
  return vec3.scale(
    result,
    vec3.add(result, mesh.positions[a], mesh.positions[b]),
    0.5
  )
}

const _getEdgeDirectionVec1 = vec3.create();
const _getEdgeDirectionVec2 = vec3.create();
function getEdgeDirection(
  mesh: QuadMesh,
  front: Edge,
  back: Edge,
  direction: Tuple3 = vec3.create()
): Tuple3 {
  const frontPosition = getEdgeCenter(mesh, front, _getEdgeDirectionVec1);
  const backPosition = getEdgeCenter(mesh, back, _getEdgeDirectionVec2);

  vec3.subtract(direction, frontPosition, backPosition);
  vec3.normalize(direction, direction);
  return direction;
}

const _extrudeVec1 = vec3.create();;
function extrude(
  state: ExtrudeState,
  quad: Quad | QuadIndex,
  edge: Edge,
  prevEdge: Edge,
  iterations: number
) {
  const { mesh, simplex2, wanderPeriod, iterationsThetaLeadIn, random, quadtree } = state;
  const originalDirection = getEdgeDirection(mesh, edge, prevEdge);
  let direction = vec3.create();
  let origin = vec3.create();
  const leadInIteration = iterationsThetaLeadIn * iterations;

  const wanderOffset = random(-state.wanderOffset, state.wanderOffset);

  for (let i = 0; i < iterations; i++) {
    const newEdge = Quads.extrudeEdge(mesh, quad, edge, 1.2, 0.99);
    const newQuad = mesh.quads.length - 1;

    origin = getEdgeCenter(mesh, edge, origin);
    direction = getEdgeDirection(mesh, newEdge, edge, direction);
    const theta = Math.atan2(direction[1], direction[0]);

    const noiseTheta = wanderOffset + Math.PI * simplex2(
      origin[0] * wanderPeriod,
      origin[1] * wanderPeriod
    );
    const leadIn = Math.min(1, i / leadInIteration);
    const thetaDiff = (noiseTheta - theta) * leadIn

    for (const positionIndex of newEdge) {
      const position = mesh.positions[positionIndex];
      vec3.rotateZ(
        position,
        position,
        origin,
        thetaDiff
      );
    }
    const newEdgeA = mesh.positions[newEdge[0]];
    const newEdgeB = mesh.positions[newEdge[1]];
    const quadTreeSearch = quadtree.find(
      (newEdgeA[0] + newEdgeA[1]) / 2,
      (newEdgeB[0] + newEdgeB[1]) / 2,
      vec3.distance(newEdgeA, newEdgeB) * 0.5
    );
    addToQuadTree(quadtree, mesh, newQuad);
    if (quadTreeSearch !== undefined) {
      break;
    }

    prevEdge = edge;
    edge = newEdge;
    quad = newQuad;
  }
}

type Edge = [number, number];

function createWithTendrilsModel(regl: Regl) {
  const identity = mat4.identity(mat4.create());

  return createWithModel(regl, "tendrils", ({ time }: DefaultContext) => {
    return identity;
  });
}

export type TendrilsContext = ModelContext<"tendrils">;

interface Overrides {
  vertHeader: string;
  vertBody: string;
  fragHeader: string;
  fragBody: string;
}

export interface TendrilsProps {}

function createDrawTendrils(
  regl: Regl,
  mesh: QuadMesh,
  overrides: Partial<Overrides>
) {
  const { getProp, getContext } = accessors<TendrilsProps, TendrilsContext>();
  return drawCommand<TendrilsProps, TendrilsContext>(regl, {
    name: "drawTendrils",
    vert: glsl`
      precision highp float;
      uniform vec3 cameraPosition;
      attribute vec3 normal, position;
      uniform float time; // Used in overrides.
      uniform mat3 viewNormal, modelNormal;
      uniform mat4 model, projView;
      varying vec3 vNormal, vViewPosition, vPosition;
      ${overrides.vertHeader || ""}

      void main() {
        vNormal = viewNormal * modelNormal * normal;

        // Do not rename.
        vec3 morphed = position;
        ${overrides.vertBody || ""}
        vec4 worldPosition = model * vec4(morphed, 1.0);
        vPosition = position;
        vViewPosition = cameraPosition - worldPosition.xyz;
        gl_Position = projView * worldPosition;
      }
    `,
    frag: glsl`
      precision highp float;
      uniform float time;
      varying vec3 vNormal, vViewPosition, vPosition;
      ${overrides.fragHeader || ""}

      void main() {
        vec3 color = vec3(0.5);
        ${overrides.fragBody || ""}
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    attributes: {
      position: mesh.positions,
      normal: mesh.normals,
    },
    uniforms: {
      model: getContext("tendrilsModel"),
      modelNormal: getContext("tendrilsModelNormal"),
    },
    elements: Quads.getElements(mesh, "triangle"),
    primitive: "triangles",
    cull: { enable: true },
  });
}
