// /* eslint-disable @typescript-eslint/no-var-requires */
import { glsl, initRegl } from "lib/regl-helpers";
import _regl from "lib/regl";
import { generateSeed, setupCanvasFrame } from "lib/draw";
import resl from "resl";

import "lib/shortcuts";
import { createWithScene } from "lib/draw/with-scene";
import { createDrawBackground } from "lib/draw/background";
import { createDrawDust } from "lib/draw/dust";
import { createDrawLabelQuads } from "lib/draw/label-quads";
import { createTendrils } from "./tendrils";
import { rad } from "lib/utils";
import { hslToRgb } from "lib/color-conversion";

const seed = generateSeed();

const regl = initRegl({ canvas: setupCanvasFrame() });
const { drawTendrils, withTendrilsModel, tendrilsMesh } = createTendrils(
  regl,
  seed
);
const drawLabelQuads = createDrawLabelQuads(regl, tendrilsMesh, false);

const withScene = createWithScene(regl, {
  rememberControls: true,
  cameraFOV: 0.5,
  orbit: {
    target: [0, 0.05, 0],
    phi: rad(0.52),
    theta: rad(0.19),
    distance: 1.5,

    distanceBounds: [0.5, 1.98],
    // rotateSpeed: 0.001,
    // damping: 0.01,

    // Debug parameters:
    thetaBounds: [-Infinity, Infinity],
    phiBounds: [-Infinity, Infinity],
    rotateSpeed: 0.025,
    damping: 0.05,
  },
});

const drawBackground = createDrawBackground(regl);
const backgroundProps = {
  topColor: hslToRgb(0.15, 0, 0.5),
  bottomColor: hslToRgb(0.9, 0, 0.55),
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
  manifest: {},
  onDone: (assets) => {
    const frameLoop = regl.frame(() => {
      try {
        regl.clear(clear);
        withScene(() => {
          withTendrilsModel((modelContext) => {
            drawTendrils();
            drawBackground(backgroundProps);
            // eslint-disable-next-line no-constant-condition
            if (false) {
              const props = {
                model: modelContext.tendrilsModel,
                modelNormal: modelContext.tendrilsModelNormal,
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
      frameLoop.cancel();
    });
  },
});
