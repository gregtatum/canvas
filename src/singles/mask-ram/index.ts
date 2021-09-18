// /* eslint-disable @typescript-eslint/no-var-requires */
import { glsl, initRegl } from "lib/regl-helpers";
import _regl from "lib/regl";
import { setupSquareCanvas } from "lib/draw";
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

const regl = initRegl({ canvas: setupSquareCanvas() });
const { mask, body } = createCuttleFish();
const { drawMask } = createMask(regl, mask, {
  vertBody: glsl`
    morphed = morphed.xyz;
  `,
  fragHeader: colorConversions,
  fragBody: glsl`
    float comp = (sin(vPosition.z * -30.0 + time * 10.0) * 0.5 + 0.5) +
      (sin(vPosition.z * -80.0 + time * 17.0) * 0.5 + 0.5);
    color = color + vec3(0.0, comp * 0.05, 0.0);

  `,
});

const withScene = createWithScene(regl, {
  rememberControls: true,
  // cameraFOV: 0.6,
  orbit: {
    target: [0, 0, 0],
    // phi: Math.PI * 0.6,
    theta: Math.PI * -0.3,
    distance: 1.3,

    distanceBounds: [0.5, 1.98],
    thetaBounds: [-Infinity, Infinity],
    phiBounds: [-Infinity, Infinity],
    // rotateSpeed: 0.001,
    rotateSpeed: 0.025,
    damping: 0.05,
  },
});
const drawMaskBody = createDrawMaskBody(regl, body);
const withMaskModel = createWithMaskModel(regl);
const bodyProps: MaskBodyProps = { color: hslToRgb(0.0, 0.78, 0.55) };
const drawLabelQuads = createDrawLabelQuads(regl, mask);

const drawBackground = createDrawBackground(regl);
const backgroundProps = {
  topColor: hslToRgb(0.15, 1, 0.5),
  bottomColor: hslToRgb(0.9, 0.78, 0.55),
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
              drawLabelQuads.drawCellIndices(props);
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
