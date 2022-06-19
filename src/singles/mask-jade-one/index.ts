// /* eslint-disable @typescript-eslint/no-var-requires */
import { initRegl } from "lib/regl-helpers";
import _regl from "lib/regl";
import resl from "resl";

import initializeShortcuts from "lib/shortcuts";
import { createWithScene } from "lib/draw/with-scene";
import { createMask } from "lib/draw/mask";
import { createDrawMaskBody, MaskBodyProps } from "lib/draw/mask-body";
import { createDrawBackground } from "lib/draw/background";
import { createDrawDust } from "lib/draw/dust";
import { createDrawLabelQuads } from "lib/draw/label-quads";
import { createJadeOne } from "./geometry";

initializeShortcuts();

const regl = initRegl();
const { mask, body } = createJadeOne();
const { withMaskModel, drawMask } = createMask(regl, mask);
const withScene = createWithScene(regl, {
  orbit: {
    distanceBounds: [0.5, 1.98],
  },
});
const drawMaskBody = createDrawMaskBody(regl, body);
const drawBackground = createDrawBackground(regl);
const drawDust = createDrawDust(regl);
const drawLabelQuads = createDrawLabelQuads(regl, mask);
const clear = { depth: 1.0, color: [0, 0, 0, 1] as Tuple4 };
const bodyProps: MaskBodyProps = { color: [0, 1, 0] };
const backgroundProps = {
  bottomColor: [0.35, 0.85, 0.8],
  topColor: [0.35, 0.85, 0.8],
};

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
              drawLabelQuads.drawPositionIndices(props);
            }
            drawDust();
          });
        });
      } catch (error) {
        console.error(error);
        frameLoop.cancel();
      }
    });
  },
});
