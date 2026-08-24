// ========== Amap Web API Client ==========

const AMAP_WEB_KEY = process.env.AMAP_WEB_KEY || "";
const AMAP_JS_KEY = process.env.AMAP_JS_KEY || "";
const AMAP_SECRET = process.env.AMAP_SECRET || "";

export function getWebKey(): string {
  if (!AMAP_WEB_KEY) throw new Error("Missing AMAP_WEB_KEY environment variable");
  return AMAP_WEB_KEY;
}

export function getJsKey(): string {
  return AMAP_JS_KEY;
}

export function getAmapSecret(): string {
  return AMAP_SECRET;
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
