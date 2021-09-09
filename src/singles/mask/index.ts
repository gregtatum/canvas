// /* eslint-disable @typescript-eslint/no-var-requires */
import { initRegl } from "lib/regl-helpers";
import _regl from "lib/regl";
import resl from "resl";

import "lib/shortcuts";
import { createWithScene } from "lib/draw/with-scene";
import { createMask } from "./mask";
import { createMaskBody } from "./mask-body";
import { createDrawBackground } from "./background";
import { createDrawDust } from "./dust";
import { createDrawLabelQuads } from "./label-quads";

const regl = initRegl();
const { withMaskModel, drawMask, maskMesh } = createMask(regl);
const withScene = createWithScene(regl, {
  orbit: {
    distanceBounds: [0.5, 0.98],
  },
});
const { drawMaskBody, maskBodyQuads } = createMaskBody(regl);
const drawBackground = createDrawBackground(regl);
const drawDust = createDrawDust(regl);
const drawLabelQuads = createDrawLabelQuads(regl, maskMesh);
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
            drawMaskBody();
            drawBackground();
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
