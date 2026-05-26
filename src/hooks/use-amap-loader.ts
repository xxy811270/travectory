"use client";

import { useState, useEffect, useRef } from "react";

interface AmapLoaderState {
  loaded: boolean;
  loading: boolean;
  error: Error | null;
  AMap: typeof window.AMap | null;
}

let globalAMap: typeof window.AMap | null = null;
let loadPromise: Promise<typeof window.AMap> | null = null;

const AMAP_KEY = "845e62b164ef5f9f6cf9b26a98f3cd4a";
const AMAP_VERSION = "2.0";
const AMAP_PLUGINS = [
  "AMap.Marker",
  "AMap.Polyline",
  "AMap.PolyEditor",
  "AMap.Geocoder",
  "AMap.AutoComplete",
  "AMap.PlaceSearch",
  "AMap.Driving",
  "AMap.Walking",
  "AMap.Riding",
];

function loadAmapScript(): Promise<typeof window.AMap> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.AMap && window.AMap.Map) {
      resolve(window.AMap);
      return;
    }

    // Check if script already exists (from previous attempt)
    const existing = document.querySelector("script[src*='webapi.amap.com']");
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.AMap) resolve(window.AMap);
        else reject(new Error("AMap failed to initialize"));
      });
      existing.addEventListener("error", () => reject(new Error("Failed to load AMap script")));
      return;
    }

    // MUST set security config before loading Amap script
    window._AMapSecurityConfig = {
      securityJsCode: "fcbdbb9b1e5d1409235e80f665996ba4",
    };

    // Build URL with plugin parameter (singular for v2.0)
    const pluginStr = AMAP_PLUGINS.join(",");
    const src = `https://webapi.amap.com/maps?v=${AMAP_VERSION}&key=${AMAP_KEY}&plugin=${pluginStr}`;

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      // Poll for AMap to be ready
      let attempts = 0;
      const check = () => {
        if (window.AMap && window.AMap.Map) {
          resolve(window.AMap);
        } else if (attempts < 50) {
          attempts++;
          setTimeout(check, 100);
        } else {
          reject(new Error("AMap not available after script load"));
        }
      };
      check();
    };
    script.onerror = () => reject(new Error("Failed to load AMap script"));

    document.head.appendChild(script);
  });
}

export function useAmapLoader(): AmapLoaderState {
  const [state, setState] = useState<AmapLoaderState>({
    loaded: !!globalAMap,
    loading: !globalAMap,
    error: null,
    AMap: globalAMap,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (globalAMap) {
      setState({ loaded: true, loading: false, error: null, AMap: globalAMap });
      return;
    }

    if (!loadPromise) {
      loadPromise = loadAmapScript();
    }

    loadPromise
      .then((AMap) => {
        globalAMap = AMap;
        if (mountedRef.current) {
          setState({ loaded: true, loading: false, error: null, AMap });
        }
      })
      .catch((err: Error) => {
        if (mountedRef.current) {
          setState({ loaded: false, loading: false, error: err, AMap: null });
        }
      });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return state;
}
