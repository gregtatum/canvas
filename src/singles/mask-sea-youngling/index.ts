// /* eslint-disable @typescript-eslint/no-var-requires */
import { glsl, initRegl } from "lib/regl-helpers";
import _regl from "lib/regl";
import { setupCanvasFrame } from "lib/draw";
import resl from "resl";

import "lib/shortcuts";
import { createWithScene } from "lib/draw/with-scene";
import { createMask } from "lib/draw/mask";
import { createDrawMaskBody, MaskBodyProps } from "lib/draw/mask-body";
import { createDrawBackground } from "lib/draw/background";
import { createDrawDust } from "lib/draw/dust";
import { createDrawLabelQuads } from "lib/draw/label-quads";
import { createCuttleFish, createWithMaskModel } from "./geometry";
import { colorConversions } from "lib/shaders";
import { hslToRgb } from "lib/color-conversion";
import initializeShortcuts from "lib/shortcuts";

initializeShortcuts();

const regl = initRegl({ canvas: setupCanvasFrame() });
const { mask, body } = createCuttleFish();
const { drawMask } = createMask(regl, mask, {
  vertBody: glsl`
    morphed.y += clamp(-morphed.y - 0.1, 0.0, 1.0) *
      (sin(0.8 * time + morphed.x * 15.0) * -0.25);
  `,
  fragHeader: colorConversions,
  fragBody: glsl`
    // Compute the up and down fade of the colors
    float t = clamp(0.8, 1.0, vPosition.y * 2.0 + 1.2);

    // Determine the sin component in terms of the distance form the center.
    float d = distance(vPosition, vec3(0.0, 0.0, 0.0));
    float waveInOut = mix(1.0, 1.1, sin(vPosition.x * 40.0 + time * 3.0) * 0.5 + 0.5);
    t = mix(t, 1.0, sin(waveInOut * d * -100.0 + time * 8.0) * 0.5 + 0.5);

    // Get a nice color as it fades out to the tentacles.
    vec3 hsl = vec3(0.8 + d * 0.4, 1.0, 0.5);
    color = mix(hslToRgb(hsl), color, t);
  `,
});
const withScene = createWithScene(regl, {
  orbit: {
    target: [0.0, -0.0, 0],
    // position: [0, 0, 1.8],
    phi: Math.PI * 0.6,
    theta: Math.PI * -0.05,
    distance: 1.3,

    distanceBounds: [0.5, 1.98],
    thetaBounds: [-Math.PI * 0.4, Math.PI * 0.4],
    rotateSpeed: 0.001,
    // rotateSpeed: 0.025,
    // damping: 0.05,
  },
});
const drawMaskBody = createDrawMaskBody(regl, body);
const withMaskModel = createWithMaskModel(regl);
const bodyProps: MaskBodyProps = { color: hslToRgb(0.0, 0.78, 0.55) };
const drawLabelQuads = createDrawLabelQuads(regl, mask);

const drawBackground = createDrawBackground(regl);
const backgroundProps = {
  topColor: hslToRgb(0.6, 0.9, 0.55),
  bottomColor: hslToRgb(0.9, 0.78, 0.35),
  colorOffset: 0.4,
  colorScale: 0.3,
};

const drawDust = createDrawDust(regl, { dustCount: 1000 });
const dustProps = {
  dustSize: 0.02,
  dustSpeed: -0.02,
};

const clear = { depth: 1.0, color: [0, 0, 0, 1] as Tuple4 };

resl({
  manifest: {
    matcapTexture: {
      type: "image",
      // Ensure the art archiver can find the assets by defining them in the package.json.
      src: "html/" + require("./package.json").htmlFiles[1],
      parser: (data) =>
        regl.texture({
          data: data as HTMLImageElement,
          mag: "linear",
          min: "linear",
        }),
    },
  },
  onDone: (assets) => {
    const frameLoop = regl.frame(() => {
      try {
        regl.clear(clear);
        withScene(() => {
          withMaskModel((ctx) => {
            drawMask(assets);
            drawMaskBody(bodyProps);
            drawBackground(backgroundProps);
            // eslint-disable-next-line no-constant-condition
            if (true) {
              const props = {
                model: ctx.headModel,
                modelNormal: ctx.headModelNormal,
              };
              drawLabelQuads.drawLines(props);
              // drawLabelQuads.drawCellIndices(props);
              // drawLabelQuads.drawPositionIndices(props);
            }
            drawDust(dustProps);
          });
        });
      } catch (error) {
        console.error(error);
        frameLoop.cancel();
      }
    });
  },
});
