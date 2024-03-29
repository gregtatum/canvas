/* eslint-disable @typescript-eslint/ban-types */
import startRegl, {
  DrawCommand,
  InitializationOptions,
  Regl,
  DefaultContext,
  DrawConfig,
  DynamicVariableFn,
} from "lib/regl";

/**
 * Apply a nice error to the DOM when a regl error occurs.
 */
export function initRegl(
  config: InitializationOptions & { canvas?: HTMLCanvasElement } = {}
): Regl {
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
  const combinedConfig: InitializationOptions = {
    ...baseConfig,
    ...config,
  };
  const { canvas } = combinedConfig;
  if (canvas && canvas instanceof HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", {
      preserveDrawingBuffer: true,
    });
    if (gl) {
      combinedConfig.gl = gl;
    }
    return startRegl(combinedConfig);
  }
  return startRegl(combinedConfig);
}

/**
 * A utility to apply the TypeScript types to the regl command in a minimalist way.
 */
export function drawCommand<
  Props extends {},
  Context extends DefaultContext = DefaultContext
>(
  regl: Regl,
  drawConfig: DrawConfig<any, any, Props, any, Context> & { name: string }
) {
  return regl(drawConfig);
}

export function accessors<
  Props extends {} = {},
  Context extends DefaultContext = DefaultContext
>() {
  function getProp<K extends keyof Props>(
    key: K,
    defaultValue?: Props[K]
  ): DynamicVariableFn<Props[K], Context, Props> {
    return (_, props) => {
      if (!props && defaultValue !== undefined) {
        return defaultValue;
      }
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
  Props extends {} = {}
>(
  drawA: DrawCommand<Context, Props>,
  drawB: DrawCommand<Context, Props>
): DrawCommand<Context, Props> {
  const name = `composed(${drawA.name},${drawB.name})`;
  const namedFn = {
    [name]: (props: Props) => {
      drawA(props, () => drawB(props));
    },
  };

  return namedFn[name] as any;
}

/**
 * Memoizes a function based on the current draw tick.
 */
export function tickMemoized<Context extends DefaultContext, T>(
  fn: (ctx: Context) => T
): (ctx: Context) => T {
  let lastTick = -1;
  let lastT: T;
  return (ctx: Context) => {
    if (ctx.tick !== lastTick) {
      lastT = fn(ctx);
      lastTick = ctx.tick;
    }
    return lastT;
  };
}

/**
 * Allow for tagging content using a template literal. This function passes through
 * the template literal.
 */
function passThroughTemplateLiteral(
  strings: TemplateStringsArray,
  ...injections: any[]
): string {
  let output = "";
  const length = Math.max(strings.length, injections.length);
  for (let i = 0; i < length; i++) {
    const string = strings[i];
    const injection = injections[i];
    if (i < strings.length) {
      output += string;
    }
    if (i < injections.length) {
      output += injection;
    }
  }
  return output;
}

export const glsl = passThroughTemplateLiteral;
