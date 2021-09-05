declare module "rtree" {
  export interface RTreeRectangle {
    x: number;
    y: number;
    w: number;
    h: number;
  }

  export interface RTree<T> {
    insert(bounds: RTreeRectangle, element: T): boolean;
    remove(area: RTreeRectangle, element?: T): T[];
    geoJSON(geoJSON: any): void;
    bbox(x1: any, y1: any, x2: number, y2: number): T[];
    search(
      area: RTreeRectangle,
      // eslint-disable-next-line @typescript-eslint/camelcase
      return_node?: boolean,
      // eslint-disable-next-line @typescript-eslint/camelcase
      return_array?: T[]
    ): T[];
  }

  const createRTRree: <T>(maxNodeWidth?: number) => RTree<T>;
  export default createRTRree;
}
