// /* eslint-disable @typescript-eslint/no-var-requires */
import { initRegl } from "lib/regl-helpers";
import _regl from "lib/regl";
import resl from "resl";

import "lib/shortcuts";
import { createWithScene } from "lib/draw/with-scene";
import { createMask } from "lib/draw/mask";
import { createDrawMaskBody, MaskBodyProps } from "lib/draw/mask-body";
import { createDrawBackground } from "lib/draw/background";
import { createDrawDust } from "lib/draw/dust";
import { createDrawLabelQuads } from "lib/draw/label-quads";
import { createCuttleFish, createWithMaskModel } from "./geometry";

const regl = initRegl();
const { mask, body } = createCuttleFish();
const { drawMask } = createMask(regl, mask);
const withScene = createWithScene(regl, {
  orbit: {
    theta: Math.PI * 0.2,
    position: [0, 0, 1.7],
    distanceBounds: [0.5, 1.98],
    rotateSpeed: 0.025,
    damping: 0.05,
  },
});
const drawMaskBody = createDrawMaskBody(regl, body);
const withMaskModel = createWithMaskModel(regl);
const drawBackground = createDrawBackground(regl);
const drawDust = createDrawDust(regl);
const drawLabelQuads = createDrawLabelQuads(regl, mask);
const clear = { depth: 1.0, color: [0, 0, 0, 1] as Tuple4 };
const bodyProps: MaskBodyProps = { color: [0.6, 0, 0.25] };
const backgroundProps = { color: [0.5, 0.2, 0.9] as Tuple3 };

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
