type RandomFn = (() => number) &
  ((max: number) => number) &
  ((min: number, max: number) => number) &
  ((min: number, max: number, isInteger: boolean) => number);

declare module "@tatumcreative/random" {
  const setupRandom: (...seed: Array<string | number>) => RandomFn;
  export default setupRandom;
}
