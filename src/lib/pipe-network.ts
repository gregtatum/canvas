import { Facing } from "lib/quads";
import setupRandom from "@tatumcreative/random";
import { ensureExists } from "lib/utils";
import * as Quads from "lib/quads";

/**
 * A unique number to reference a PipeNode
 */
export type PipeNodeID = number;

export interface PipeNetworkConfig {
  dimensions: Tuple3<number>;
  pipeLengths: Tuple3<number>;
  pipeRadius: number;
  desiredNodeCount: { count: number } | { ratio: number };
  seed?: string | void;
}

export class PipeNetwork {
  mesh: QuadMesh = {
    positions: [],
    quads: [],
  };

  nodes: PipeNode[] = [];
  nodeIdMap: Map<PipeNodeID, PipeNode> = new Map();

  dimensions: Tuple3<number>;
  pipeLengths: Tuple3<number>;
  pipeRadius: number;
  desiredNodeCount: number;
  maxPossibleNodes: number;
  random: () => number;

  constructor(config: PipeNetworkConfig) {
    this.dimensions = config.dimensions;
    this.pipeLengths = config.pipeLengths;
    this.pipeRadius = config.pipeRadius;
    this.maxPossibleNodes =
      this.dimensions[0] * this.dimensions[1] * this.dimensions[2];
    if ("count" in config.desiredNodeCount) {
      this.desiredNodeCount = config.desiredNodeCount.count;
    } else {
      this.desiredNodeCount =
        config.desiredNodeCount.ratio * this.maxPossibleNodes;
    }
    this.random = setupRandom(config.seed ?? Math.random());

    this.buildViaRandomWalkers();
    const center = Quads.getPositionsCenter(this.mesh.positions);
    for (const position of this.mesh.positions) {
      position[0] -= center[0];
      position[1] -= center[1];
      position[2] -= center[2];
    }
  }

  buildViaRandomWalkers() {
    const [xD, yD, zD] = this.dimensions;
    while (
      this.nodes.length < Math.min(this.desiredNodeCount, this.maxPossibleNodes)
    ) {
      let startX = Math.floor(this.dimensions[0] * this.random());
      let startY = Math.floor(this.dimensions[1] * this.random());
      let startZ = Math.floor(this.dimensions[2] * this.random());
      let node: null | PipeNode = this.getNode(startX, startY, startZ);
      let i = 0;
      const dirX = this.random() > 0.5 ? -1 : 1;
      const dirY = this.random() > 0.5 ? -1 : 1;
      const dirZ = this.random() > 0.5 ? -1 : 1;
      while (node === null || node.isFilled) {
        i++;
        if (i > this.maxPossibleNodes) {
          throw new Error("Logic error in the buildRandomNodes loop.");
        }
        // Find a gosh-durn empty node.
        startX = (startX + dirX + xD) % xD;
        if (startX === 0) {
          startY = (startY + dirY + yD) % yD;
          if (startY === 0) {
            startZ = (startZ + dirZ + zD) % zD;
          }
        }
        node = this.getNode(startX, startY, startZ);
      }

      node.fillInNode();
      while (node !== null && this.nodes.length < this.desiredNodeCount) {
        const result = node.getRandomNeighbor((node) => !node.isFilled);
        if (result === null) {
          break;
        }
        result.neighbor.fillInNode();
        node.connect(result.neighbor, result.facing);
        node = result.neighbor;
      }
    }
  }

  getNodeID(x: number, y: number, z: number) {
    const [xD, yD, zD] = this.dimensions;
    if (x > xD || x < 0 || y > yD || y < 0 || z > zD || z < 0) {
      return null;
    }
    return x + y * xD + z * xD * yD;
  }

  getNode(x: number, y: number, z: number): PipeNode | null {
    const nodeID = this.getNodeID(x, y, z);
    if (nodeID === null) {
      return null;
    }
    let node = this.nodeIdMap.get(nodeID);
    if (node) {
      return node;
    }
    node = new PipeNode(this, x, y, z);
    this.nodes.push(node);
    this.nodeIdMap.set(node.id, node);
    return node;
  }
}

export interface Faces {
  xm: null | QuadIndex;
  xp: null | QuadIndex;
  ym: null | QuadIndex;
  yp: null | QuadIndex;
  zm: null | QuadIndex;
  zp: null | QuadIndex;
}

export class PipeNode {
  x: number;
  y: number;
  z: number;
  id: number;
  network: PipeNetwork;
  positionOffset = 0;
  quadOffset = 0;
  hasPoints = false;
  isFilled = false;
  faces = {
    xm: null,
    xp: null,
    ym: null,
    yp: null,
    zm: null,
    zp: null,
  };

  constructor(network: PipeNetwork, x: number, y: number, z: number) {
    this.network = network;
    this.x = x;
    this.y = y;
    this.z = z;
    this.id = this.#getID();
  }

  /**
   * Get a unique number representative of this node.
   */
  #getID(): number {
    return ensureExists(
      this.network.getNodeID(this.x, this.y, this.z),
      "Expected a ndoe ID to exist for a created node."
    );
  }

  // Face ordering: [x-, x+, y-, y+, z-, z+]
  #addPoints() {
    if (this.hasPoints) {
      throw new Error(
        "Logic error, adding points to a node that already has points."
      );
    }
    this.hasPoints = true;
    const { mesh, pipeLengths, pipeRadius, dimensions } = this.network;
    const { positions } = mesh;
    this.positionOffset = positions.length;
    const halfNodeW = pipeRadius / 2;
    const x = this.x * pipeLengths[0];
    const y = this.y * pipeLengths[1];
    const z = this.z * pipeLengths[2];
    const halfPipeX = (pipeLengths[0] * (dimensions[0] - 1)) / 2;
    const halfPipeY = (pipeLengths[1] * (dimensions[1] - 1)) / 2;
    const halfPipeZ = (pipeLengths[2] * (dimensions[2] - 1)) / 2;

    const xm = x - halfNodeW - halfPipeX;
    const xp = x + halfNodeW - halfPipeX;
    const ym = y - halfNodeW - halfPipeY;
    const yp = y + halfNodeW - halfPipeY;
    const zm = z - halfNodeW - halfPipeZ;
    const zp = z + halfNodeW - halfPipeZ;
    positions.push(
      // x-
      [xm, ym, zm], // [0, 1, 2, 3]
      [xm, ym, zp],
      [xm, yp, zp],
      [xm, yp, zm],
      // x+
      [xp, ym, zp], // [4, 5, 6, 7]
      [xp, ym, zm],
      [xp, yp, zm],
      [xp, yp, zp],
      // y-
      [xm, ym, zm], // [8, 9, 10, 11]
      [xp, ym, zm],
      [xp, ym, zp],
      [xm, ym, zp],
      // y+
      [xp, yp, zm], // [12, 13, 14, 15]
      [xm, yp, zm],
      [xm, yp, zp],
      [xp, yp, zp],
      // z-
      [xm, ym, zm], // [16, 17, 18, 19]
      [xm, yp, zm],
      [xp, yp, zm],
      [xp, ym, zm],
      // z+
      [xm, yp, zp], // [20, 21, 22, 23]
      [xm, ym, zp],
      [xp, ym, zp],
      [xp, yp, zp]
    );
  }

  fillInNode() {
    if (this.isFilled) {
      throw new Error(
        "Logic error, filling in a node that was already filled in."
      );
    }

    if (!this.hasPoints) {
      this.#addPoints();
    }

    this.isFilled = true;
    const { quads } = this.network.mesh;
    const o = this.positionOffset;

    this.quadOffset = quads.length;
    quads.push(
      [0 + o, 1 + o, 2 + o, 3 + o], //     x-
      [4 + o, 5 + o, 6 + o, 7 + o], //     x+
      [8 + o, 9 + o, 10 + o, 11 + o], //   y-
      [12 + o, 13 + o, 14 + o, 15 + o], // y+
      [16 + o, 17 + o, 18 + o, 19 + o], // z-
      [20 + o, 21 + o, 22 + o, 23 + o] //  z+
    );
  }

  getNeighbor(facing: Facing): null | PipeNode {
    switch (facing) {
      case "x+":
        return this.network.getNode(this.x + 1, this.y, this.z);
      case "x-":
        return this.network.getNode(this.x - 1, this.y, this.z);
      case "y+":
        return this.network.getNode(this.x, this.y + 1, this.z);
      case "y-":
        return this.network.getNode(this.x, this.y - 1, this.z);
      case "z+":
        return this.network.getNode(this.x, this.y, this.z + 1);
      case "z-":
        return this.network.getNode(this.x, this.y, this.z - 1);
      default:
        return null;
    }
  }

  #faces: Facing[] = ["x+", "x-", "y+", "y-", "z+", "z-"];

  getRandomNeighbor(
    conditionFn?: (node: PipeNode) => boolean
  ): null | { neighbor: PipeNode; facing: Facing } {
    const faces = this.#faces;
    for (let i = 0; i < faces.length - 1; i++) {
      const j = i + Math.floor((faces.length - i) * this.network.random());
      const a = faces[i];
      const b = faces[j];
      faces[i] = b;
      faces[j] = a;
    }
    for (const facing of faces) {
      const neighbor = this.getNeighbor(facing);
      if (conditionFn) {
        if (neighbor && conditionFn(neighbor)) {
          return { neighbor, facing };
        }
      } else if (neighbor) {
        return { neighbor, facing };
      }
    }
    return null;
  }

  connect(neighbor: PipeNode, facing: Facing) {
    let nodeQuadIndex = this.quadOffset;
    let neighborQuadIndex = neighbor.quadOffset;
    const xm = 0;
    const xp = 1;
    const ym = 2;
    const yp = 3;
    const zm = 4;
    const zp = 5;

    const { mesh } = this.network;

    switch (facing) {
      case "x-":
        nodeQuadIndex += xm;
        neighborQuadIndex += xp;
        break;
      case "x+":
        nodeQuadIndex += xp;
        neighborQuadIndex += xm;
        break;
      case "y-":
        nodeQuadIndex += ym;
        neighborQuadIndex += yp;
        break;
      case "y+":
        nodeQuadIndex += yp;
        neighborQuadIndex += ym;
        break;
      case "z-":
        nodeQuadIndex += zm;
        neighborQuadIndex += zp;
        break;
      case "z+":
        nodeQuadIndex += zp;
        neighborQuadIndex += zm;
        break;
      default:
    }

    Quads.tunnelNoInset(mesh, nodeQuadIndex, neighborQuadIndex);
    // mesh.quads[nodeQuadIndex] = mesh.quads.pop()!;
    // mesh.quads[neighborQuadIndex] = mesh.quads.pop()!;
  }
}
