// /* eslint-disable @typescript-eslint/no-var-requires */
import { initRegl } from "lib/regl";
import _regl from "regl";
import resl from "resl";

import _setupScene, { SceneContext } from "./scene";
import _drawMask from "./mask";
import _maskBody from "./mask-body";
import _background from "./background";
import _dust from "./background";
import _labelQuads from "./label-quads";

const regl = initRegl();
const setupScene = _setupScene(regl);
const { drawMask, maskMesh } = _drawMask(regl);
// const { drawMaskBody, maskBodyQuads } = _maskBody(regl);
const drawBackground = _background(regl);
const drawDust = _dust(regl);
const maskLabels = _labelQuads(regl, maskMesh);
const clear = { depth: 1.0, color: [0, 0, 0, 1] as Tuple4 };

resl({
  manifest: {
    matcapTexture: {
      type: "image",
      src: "html/matcap/Jade_Light.png",
      parser: data =>
        regl.texture({
          data: data as HTMLImageElement,
          mag: "linear",
          min: "linear",
        }),
    },
  },
  onDone: assets => {
    const frameLoop = regl.frame(() => {
      try {
        regl.clear(clear);
        setupScene((ctx: SceneContext) => {
          drawMask(assets);
          // drawMaskBody();
          drawBackground();
          // eslint-disable-next-line no-constant-condition
          if (true) {
            maskLabels.drawLines({ model: ctx.headModel });
            maskLabels.drawCellIndices({ model: ctx.headModel });
            // maskLabels.drawPositionIndices({ model: ctx.headModel });
          }
          drawDust();
        });
      } catch (error) {
        console.error(error);
        frameLoop.cancel();
      }
    });
  },
});
