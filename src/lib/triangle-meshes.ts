export function getEmptyTriangleMesh(): TriangleMesh {
  return {
    positions: [],
    cells: [],
  };
}

export function getEmptyTriangleMeshNormals(): TriangleMeshNormals {
  return {
    positions: [],
    cells: [],
    normals: [],
  };
}

export function addGeometryToTriangleMesh<
  Mesh extends TriangleMesh | TriangleMeshNormals
>(target: Mesh, toAdd: TriangleMesh | TriangleMeshNormals): void {
  const indexOffset = target.positions.length;
  for (const position of toAdd.positions) {
    target.positions.push(position);
  }

  for (const [a, b, c] of toAdd.cells) {
    target.cells.push([a + indexOffset, b + indexOffset, c + indexOffset]);
  }

  if (target.normals) {
    if (!toAdd.normals) {
      throw new Error(
        "Attempting to add geometry to an existing mesh, and the existing mesh requires normals."
      );
    }
    for (const normal of toAdd.normals) {
      target.normals.push(normal);
    }
  }
}
