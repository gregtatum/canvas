import glsl from "glslify";
import { Regl, DrawCommand } from "lib/regl";

import * as quad from "lib/quads";
import { accessors, drawCommand } from "lib/regl-helpers";
import { MaskContext } from "./mask";

export interface MaskBodyProps {
  color: Tuple3;
}

export function createDrawMaskBody(regl: Regl, mesh: QuadMesh) {
  const { getContext, getProp } = accessors<MaskBodyProps, MaskContext>();
  return drawCommand<MaskBodyProps, MaskContext>(regl, {
    name: "drawMaskBody",
    vert: glsl`
      precision highp float;
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
        vPosition = morphed.xyz;
        gl_Position = projection * view * morphed;
      }
    `,
    frag: glsl`
      precision highp float;
      varying vec3 vNormal, vPosition;
      uniform vec3 color;

      void main() {
        float brightness = max(0.0, 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)));
        brightness = 0.5 * brightness * brightness;

        vec3 baseColor = color *
          max(
            0.0,
            1.0 * distance(vPosition, vec3(0.0, 0.0, 0.0)) - 0.2
          );

        gl_FragColor = vec4(
          vec3(brightness) + baseColor,
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
      color: getProp("color"),
    },
    elements: quad.getElements(mesh, "triangle"),
    primitive: "triangles",
    cull: { enable: true },
  });
}
