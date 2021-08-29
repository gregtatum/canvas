import startRegl from "regl";
import {
  InitializationOptions,
  Regl,
  DefaultContext,
  DrawConfig,
  DynamicVariableFn,
} from "regl";

/**
 * Apply a nice error to the DOM when a regl error occurs.
 */
export function regl(config: InitializationOptions = {}): Regl {
  const baseConfig: InitializationOptions = {
    onDone: (...args) => {
      if (typeof config.onDone === "function") {
        config.onDone(...args);
      }
      const [err] = args;
      if (err) {
        const div = document.createElement("div");
        document.body.appendChild(div);
        div.className = "error";

        const divInner = document.createElement("div");
        divInner.innerText = String(err);
        div.appendChild(divInner);
      }
    },
  };

  return startRegl({
    ...baseConfig,
    config,
  } as InitializationOptions);
}

/**
 * A utility to apply the TypeScript types to the regl command in a minimalist way.
 */
export function drawCommand<
  Props,
  Context extends DefaultContext = DefaultContext
>(regl: Regl, drawConfig: DrawConfig<any, any, Props, any, Context>) {
  return regl(drawConfig);
}

export function accessors<
  Props = {},
  Context extends DefaultContext = DefaultContext
>() {
  function getProp<K extends keyof Props>(
    key: K
  ): DynamicVariableFn<Props[K], Context, Props> {
    return (_, props) => props[key];
  }

  function getContext<K extends keyof Context>(
    key: K
  ): DynamicVariableFn<Context[K], Context, Props> {
    return (ctx, _) => ctx[key];
  }

  return { getProp, getContext };
}
