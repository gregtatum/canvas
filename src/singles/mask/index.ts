// /* eslint-disable @typescript-eslint/no-var-requires */
import { initRegl } from "lib/regl-helpers";
import _regl from "lib/regl";
import resl from "resl";

import { createSetupScene, SceneContext } from "./scene";
import { createMask } from "./mask";
import _maskBody from "./mask-body";
import _background from "./background";
import _dust from "./background";
import { createDrawLabelQuads } from "./label-quads";
import { Ray3d } from "perspective-camera";

const regl = initRegl();
const { drawMask, maskMesh } = createMask(regl);
const setupScene = createSetupScene(regl);
// const { drawMaskBody, maskBodyQuads } = _maskBody(regl);
const drawBackground = _background(regl);
const drawDust = _dust(regl);
const drawLabelQuads = createDrawLabelQuads(regl, maskMesh);
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
        setupScene(function setupSceneInner(ctx: SceneContext) {
          drawMask(assets);
          // drawMaskBody();
          drawBackground();
          // eslint-disable-next-line no-constant-condition
          if (true) {
            drawLabelQuads.drawLines({ model: ctx.headModel });
            drawLabelQuads.drawCellIndices({ model: ctx.headModel });
            // drawLabelQuads.drawPositionIndices({ model: ctx.headModel });
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
