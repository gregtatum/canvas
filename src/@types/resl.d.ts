declare module "resl" {
  type ManifestTypes = "text" | "image" | "video" | "binary" | "audio";
  interface ManifestItem<Type extends ManifestTypes, ParsedResult> {
    // The type declares the type of the asset
    type: Type;
    // Declares the URL of the asset.
    src: string;
    // Setting the streaming flag specifies that the done() callback will fire as
    // soon as the asset has started loading
    stream?: boolean;
    // e.g. JSON.parse
    parser?: (item: LoadedManifestItem[Type]) => ParsedResult;
    // If set to true, then pass credentials to cross origin requests.
    credentials?: boolean;
  }

  interface LoadedManifestItem {
    text: string;
    image: HTMLImageElement;
    video: HTMLVideoElement;
    audio: HTMLAudioElement;
    binary: ArrayBuffer;
  }

  interface Manifest<Type extends ManifestTypes, ParsedResult> {
    [key: string]: ManifestItem<Type, ParsedResult>;
  }

  interface Options<
    Type extends ManifestTypes,
    ParsedResult,
    M extends Manifest<Type, ParsedResult>
  > {
    manifest: M;
    onDone: (
      assets: {
        [Property in keyof M]: M[Property]["parser"] extends Function
          ? ReturnType<M[Property]["parser"]>
          : LoadedManifestItem[M[Property]["type"]];
      }
    ) => void;
    // As assets are preloaded the progress callback gets fired
    onProgress?: (progress: number, message: string) => void;
    // Called when there is an error.
    onError?: (err: Error) => void;
  }

  const resl: <
    Type extends ManifestTypes,
    ParsedResult,
    M extends Manifest<Type, ParsedResult>
  >(
    options: Options<Type, ParsedResult, M>
  ) => void;
  export default resl;
}
