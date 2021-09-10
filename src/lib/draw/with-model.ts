import { Regl, DefaultContext, DrawCommand } from "lib/regl";
import { drawCommand, tickMemoized } from "lib/regl-helpers";
import { ensureExists } from "lib/utils";
import { mat4, mat3 } from "lib/vec-math";
import { SceneContext } from "lib/draw/with-scene";

interface Matrices {
  // These are computed:
  Model: MatrixTuple4x4;
  ModelView: MatrixTuple4x4;
  ModelNormal: MatrixTuple3x3;
}

type PrefixKeys<Prefix extends string, T> = {
  [K in keyof Matrices as `${Prefix}${K}`]: Matrices[K];
};

export interface ModelContext<Prefix extends string>
  extends PrefixKeys<Prefix, Matrices>,
    SceneContext,
    DefaultContext {}

export function createWithModel<Prefix extends string>(
  regl: Regl,
  prefix: Prefix,
  computeModel: (ctx: ModelContext<Prefix>) => MatrixTuple4x4
): DrawCommand<ModelContext<Prefix>> {
  const _arr1 = mat4.create();
  const _arr2 = mat3.create();
  const modelKey = `${prefix}Model`;
  const modelViewKey = `${prefix}ModelView`;
  const modelNormalKey = `${prefix}ModelNormal`;

  const getModel = tickMemoized(computeModel);
  const getModelView = tickMemoized((ctx: ModelContext<Prefix>) => {
    return mat4.multiply(
      _arr1,
      ensureExists(ctx.view, "Could not find the view matrix"),
      getModel(ctx)
    );
  });

  return drawCommand(regl, {
    name: "withModel",
    context: {
      [modelKey]: getModel,
      [modelViewKey]: getModelView,
      [modelNormalKey]: (ctx: ModelContext<Prefix>) => {
        const modelView = getModelView(ctx);
        return mat3.normalFromMat4(_arr2, modelView);
      },
    },
  });
}
