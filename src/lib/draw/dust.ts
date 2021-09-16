import glsl from "glslify";
import { Regl } from "lib/regl";
import { fill } from "lib/utils";
import { simplex } from "lib/shaders";
import { SceneContext } from "./with-scene";
import { accessors, drawCommand } from "../regl-helpers";

interface DustConfig {
  dustCount: number;
}

interface DustProps {
  dustSize: number;
  dustSpeed: number;
}

export function createDrawDust(
  regl: Regl,
  config: DustConfig = { dustCount: 3000 }
) {
  const { getProp } = accessors<DustProps, SceneContext>();
  return drawCommand<DustProps, SceneContext>(regl, {
    name: "drawDust",
    vert: glsl`
      precision highp float;
      ${simplex}
      attribute vec4 position;
      uniform float time, viewportHeight, aspectRatio, fov, dustSize, dustSpeed;
      uniform mat4 projView;
      varying float speed, vParticleId;
      varying vec3 vColor;

      float STAGE_SIZE = 1.3;
      float HALF_STAGE_SIZE = STAGE_SIZE * 0.5;

      void main() {
        vParticleId = position.x;
        float uniqueNumberA = position.y;
        float uniqueNumberB = position.z;
        float uniqueNumberC = position.w;
        speed = (3.0 + mod(vParticleId, 7.0)) * 0.1;
        speed *= speed;
        vColor = vec3(0.1, 0.1, 0.1);

        float x = max(1.0, aspectRatio) * (HALF_STAGE_SIZE - STAGE_SIZE * uniqueNumberA)
          + 0.02 * simplex(vec2(vParticleId, time * 0.1));
        float z = max(1.0, aspectRatio) * (HALF_STAGE_SIZE - STAGE_SIZE * uniqueNumberC)
          + 0.02 * simplex(vec2(vParticleId + 23.0, time * 0.1));

        float y = mod(dustSpeed * speed * time + uniqueNumberB, STAGE_SIZE) - HALF_STAGE_SIZE;

        gl_Position = projView * vec4(x, y, z, 1.0);
        gl_PointSize = dustSize * speed * viewportHeight * (2.0 - z);
      }
    `,
    frag: glsl`
      precision highp float;
      ${simplex}
      varying vec3 vColor;
      varying float vParticleId;
      uniform float time;

      void main() {
        float alpha = max(0.0, 2.5 * (0.5 - length(gl_PointCoord - vec2(0.5)))
          * (simplex(vec3(gl_PointCoord, vParticleId * 100.0 + time * 0.25)) * 0.5 + 0.5));
        gl_FragColor = vec4(alpha * alpha * vColor, 1.0);
      }
    `,
    uniforms: {
      time: ({ time }: SceneContext) => time + 100,
      aspectRatio: ({ viewportHeight, viewportWidth }: SceneContext) =>
        viewportWidth / viewportHeight,
      viewportHeight: ({ viewportHeight }: SceneContext) => viewportHeight,
      dustSize: getProp("dustSize", 0.02),
      dustSpeed: getProp("dustSpeed", -0.012),
    },
    attributes: {
      position: fill(config.dustCount, (i) => [
        i,
        Math.random(),
        Math.random(),
        Math.random(),
      ]),
    },
    depth: {
      enable: true,
      mask: false,
    },
    blend: {
      enable: true,
      func: {
        srcRGB: "src alpha",
        srcAlpha: 1,
        dstRGB: "one",
        dstAlpha: 1,
      },
      equation: {
        rgb: "add",
        alpha: "add",
      },
    },
    primitive: "points",
    count: config.dustCount,
  });
}
