declare module "glslify" {
  const glslify: (strings: TemplateStringsArray, ...rest: unknown[]) => string;
  export default glslify;
}
