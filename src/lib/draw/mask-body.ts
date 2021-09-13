import glsl from "glslify";
import { Regl, DrawCommand } from "lib/regl";

import * as quad from "lib/quads";
import { accessors, drawCommand } from "lib/regl-helpers";
import { MaskContext } from "./mask";

export function createDrawMaskBody(regl: Regl, mesh: QuadMesh): DrawCommand {
  const { getContext } = accessors<{}, MaskContext>();
  return drawCommand(regl, {
    name: "drawMaskBody",
    vert: glsl`
      precision mediump float;
      attribute vec3 normal, position;
      uniform mat4 model, view, projection;
      uniform mat3 viewNormal;
      uniform vec3 cameraPosition;
      varying vec3 vNormal, vPosition;

      void main() {
        vec4 morphed = mix(
          vec4(position, 1.0),
          model * vec4(position, 1.0),
          min(1.0, max(0.0, position.y + 1.0))
        );
        vNormal = viewNormal * normal;
        vPosition = position;
        gl_Position = projection * view * morphed;
      }
    `,
    frag: glsl`
      precision mediump float;
      varying vec3 vNormal, vPosition;

      void main() {
        float brightness = max(0.0, 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)));
        brightness = 0.5 * brightness * brightness;

        vec3 green = vec3(0.0, 0.5, 0.0) *
          max(
            0.0,
            1.0 * distance(vPosition, vec3(0.0, 0.0, 0.0)) - 0.2
          );

        gl_FragColor = vec4(
          vec3(brightness) + green,
          1.0
        );
      }
    `,
    attributes: {
      position: mesh.positions,
      normal: mesh.normals,
    },
    uniforms: {
      model: getContext("headModel"),
    },
    elements: quad.getElements(mesh, "triangle"),
    primitive: "triangles",
    cull: { enable: true },
  });
}
