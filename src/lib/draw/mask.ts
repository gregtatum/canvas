import glsl from "glslify";
import { DefaultContext, Regl, Texture } from "lib/regl";

import { mat4 } from "lib/vec-math";
import * as quads from "lib/quads";
import { accessors, drawCommand } from "lib/regl-helpers";
import { matcap } from "lib/shaders";
import { createWithModel, ModelContext } from "lib/draw/with-model";

const simplex = new (require("simplex-noise"))();

export type MaskContext = ModelContext<"head">;

export function createMask(regl: Regl, maskMesh: QuadMesh) {
  return {
    drawMask: createDrawMask(regl, maskMesh),
    withMaskModel: createWithMaskModel(regl),
  };
}

function createWithMaskModel(regl: Regl) {
  const out = mat4.create();
  const eye: Tuple3 = [0, 0, -1];
  const center: Tuple3 = [0, 0, 0];
  const up: Tuple3 = [0, 1, 0];

  return createWithModel(regl, "head", ({ time }: DefaultContext) => {
    center[0] = simplex.noise2D(time * 0.1, 0) * 0.05;
    center[1] = simplex.noise2D(time * 0.1, 10) * 0.025;
    up[0] = simplex.noise2D(time * 0.1, 10) * 0.25;
    eye[0] = simplex.noise2D(time * 0.05, 0) * 0.25;
    // return mat4.identity(out)
    return mat4.lookAt(out, center, eye, up);
  });
}

export interface MaskProps {
  matcapTexture: Texture;
}

function createDrawMask(regl: Regl, mesh: QuadMesh) {
  const { getProp, getContext } = accessors<MaskProps, MaskContext>();
  return drawCommand<MaskProps, MaskContext>(regl, {
    name: "drawMask",
    vert: glsl`
      precision mediump float;
      uniform vec3 cameraPosition;
      attribute vec3 normal, position;
      uniform mat3 viewNormal, modelNormal;
      uniform mat4 model, projView;
      varying vec3 vNormal, vViewPosition;

      void main() {
        vNormal = viewNormal * modelNormal * normal;
        vec4 worldPosition = model * vec4(position, 1.0);
        vViewPosition = cameraPosition - worldPosition.xyz;
        gl_Position = projView * worldPosition;
      }
    `,
    frag: glsl`
      precision mediump float;
      ${matcap}
      uniform sampler2D matcapTexture;
      varying vec3 vNormal, vViewPosition;

      void main() {
        vec2 uv = matcap(normalize(vViewPosition), normalize(vNormal));
        vec3 color = texture2D(matcapTexture, uv).rgb;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    attributes: {
      position: mesh.positions,
      normal: mesh.normals,
    },
    uniforms: {
      matcapTexture: getProp("matcapTexture"),
      model: getContext("headModel"),
      modelNormal: getContext("headModelNormal"),
    },
    elements: quads.getElements(mesh, "triangle"),
    primitive: "triangles",
    cull: { enable: true },
  });
}
