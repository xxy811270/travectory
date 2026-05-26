// ========== Amap JS API Global Type Declarations ==========

declare global {
  interface Window {
    AMap: {
      Map: new (el: HTMLElement, opts: Record<string, unknown>) => unknown;
      Marker: new (opts: Record<string, unknown>) => unknown;
      Polyline: new (opts: Record<string, unknown>) => unknown;
      InfoWindow: new (opts: Record<string, unknown>) => unknown;
      Pixel: new (x: number, y: number) => unknown;
      Bounds: new (sw: [number, number], ne: [number, number]) => unknown;
      Text: new (opts: Record<string, unknown>) => unknown;
      TileLayer: {
        new (opts?: Record<string, unknown>): unknown;
        Satellite: new (opts?: Record<string, unknown>) => unknown;
        RoadNet: new (opts?: Record<string, unknown>) => unknown;
      };
      [key: string]: unknown;
    };
    _AMapSecurityConfig?: {
      securityJsCode: string;
    };
  }
}

export {};
