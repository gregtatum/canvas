/* eslint-disable @typescript-eslint/no-var-requires */
const regl = require("../lib/regl")();
import resl from "resl";

import _setupScene from "./scene";
import _drawMask from "./mask";
import _maskBody from "./mask-body";
import _background from "./background";
import _dust from "./background";
import _labelQuads from "./label-quads";

const { drawMaskBody, maskBodyQuads } = _maskBody(regl);
const drawBackground = _background(regl);
const drawDust = _dust(regl);
const maskLabels = _labelQuads(regl, maskBodyQuads);
const { drawMask } = _drawMask(regl);
const setupScene = _setupScene(regl);

const clear = { depth: 1.0, color: [0, 0, 0, 1] };

resl({
  manifest: {
    matcapTexture: {
      type: "image",
      src: "/lib/textures/matcap/Jade_Light.png",
      parser: data => regl.texture({ data }),
    },
  },
  onDone: assets => {
    const frameLoop = regl.frame(() => {
      try {
        regl.clear(clear);
        setupScene(() => {
          drawMask(assets);
          drawMaskBody();
          drawBackground();
          // eslint-disable-next-line no-constant-condition
          if (false) {
            maskLabels.drawLines();
            maskLabels.drawCellIndices();
            maskLabels.drawPositionIndicies();
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
