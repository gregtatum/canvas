import startRegl, { DrawCommand } from "regl";
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
export function initRegl(config: InitializationOptions = {}): Regl {
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
    ...config,
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
    key: K,
    defaultValue?: Props[K]
  ): DynamicVariableFn<Props[K], Context, Props> {
    return (_, props) => {
      const value = props[key];
      if (value === undefined && defaultValue !== undefined) {
        return defaultValue;
      }
      return value;
    };
  }

  function getContext<K extends keyof Context>(
    key: K,
    defaultValue?: Context[K]
  ): DynamicVariableFn<Context[K], Context, Props> {
    return (ctx, _) => {
      const value = ctx[key];
      if (value === undefined && defaultValue !== undefined) {
        return defaultValue;
      }
      return value;
    };
  }

  return { getProp, getContext };
}

/**
 * Work around CommandBodyFn types not seeming to work as I expect them to.
 */
export function composeDrawCommands<
  Context extends DefaultContext = DefaultContext,
  Props = {}
>(
  drawA: DrawCommand<Context, Props>,
  drawB: DrawCommand<Context, Props>
): DrawCommand<Context, Props> {
  const fn: any = (props: Props) => {
    drawB(() => drawA(props));
  };
  return fn;
}