// ========== Amap Web API Client ==========

const AMAP_WEB_KEY = "865cb93a62736536b5b1146de0328d0d";
const AMAP_JS_KEY = "845e62b164ef5f9f6cf9b26a98f3cd4a";
const AMAP_SECRET = "fcbdbb9b1e5d1409235e80f665996ba4";

export function getWebKey(): string {
  return AMAP_WEB_KEY;
}

export function getJsKey(): string {
  return AMAP_JS_KEY;
}

export async function amapGet<T>(
  path: string,
  params: Record<string, string | number | undefined>
): Promise<T> {
  const url = new URL(`https://restapi.amap.com${path}`);
  url.searchParams.set("key", AMAP_WEB_KEY);

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) {
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Amap API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}
