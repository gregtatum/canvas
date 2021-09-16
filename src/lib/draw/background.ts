import glsl from "glslify";
import { simplex } from "lib/shaders";
import { Regl, DefaultContext } from "lib/regl";
import { accessors, drawCommand } from "lib/regl-helpers";

export interface BackgroundProps {
  bottomColor: Tuple3;
  topColor: Tuple3;
  colorOffset?: number;
  colorScale?: number;
}

export function createDrawBackground(regl: Regl) {
  const { getProp } = accessors<BackgroundProps, DefaultContext>();
  return drawCommand<BackgroundProps, DefaultContext>(regl, {
    name: "drawBackground",
    vert: glsl`
      precision highp float;
      attribute vec2 position;
      uniform mat4 inverseProjection, inverseView;
      varying vec3 vDirection;
      varying vec2 vUv;

      void main () {
        vDirection = mat3(inverseView) * (inverseProjection * vec4(position, 0, 1)).xyz;
        gl_Position = vec4(position, 0.99999, 1);
        vUv = gl_Position.xy;
      }
    `,
    frag: glsl`
      precision highp float;
      ${simplex}

      uniform float time, colorOffset, colorScale;
      uniform vec3 bottomColor;
      uniform vec3 topColor;
      varying vec3 vDirection;
      varying vec2 vUv;

      void main () {
        vec3 direction = normalize(vDirection);
        float topLight = mix(
          0.0, 1.0,
          min(1.0, 0.5 + 0.5 * dot(direction, vec3(0.0, 1.0, 0.0)))
        );

        float vignette = 1.0 - pow(length(vUv * 0.5), 2.0);
        float noise = mix(1.5, 1.7, simplex(vec3(direction.xz * 7.0, time * 0.5)));

        vec3 baseColor = mix(bottomColor, topColor, clamp(0.0, 1.0, vUv.y * colorScale + colorOffset));

        gl_FragColor = vec4(
          topLight * baseColor * vignette * noise,
          1.0
        );
      }
    `,
    uniforms: {
      bottomColor: getProp("bottomColor"),
      topColor: getProp("topColor"),
      colorOffset: getProp("colorOffset", 0),
      colorScale: getProp("colorScale", 1),
    },
    depth: { enable: true },
    attributes: {
      position: [
        [-4, -4],
        [0, 4],
        [4, -4],
      ],
    },
    count: 3,
  });
}
