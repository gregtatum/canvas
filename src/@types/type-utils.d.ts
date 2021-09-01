type ApplyDynamicConfig<Ctx> = {
  [Property in keyof Ctx]: Ctx[Property] extends (...args: any) => infer R
    ? R
    : Ctx[Property];
};
