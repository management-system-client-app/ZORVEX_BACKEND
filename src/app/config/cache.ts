import logger from "../../config/logger";
import { redisEnabled, upstashCommand } from "./redis";

export const CATALOG_CACHE_TTL_SECONDS = 120;
export const PRODUCT_CACHE_TTL_SECONDS = 45;

type CacheScope = "catalog" | "products" | "home" | "content";

// Keep a very short per-instance cache in front of Redis. This avoids two
// HTTP round trips to Upstash for every hot cache hit and collapses concurrent
// misses in a serverless instance into one Redis/Postgres load.
const LOCAL_CACHE_TTL_MS = 3_000;
const localCache = new Map<string, { value: unknown; expiresAt: number }>();
const pendingLoads = new Map<string, Promise<unknown>>();

const versionKey = (scope: CacheScope): string => `shop:${scope}:version`;

const warn = (action: string, error: unknown): void => {
  logger.warn(`Cache ${action} failed`, {
    message: error instanceof Error ? error.message : "unknown",
  });
};

export const cacheKey = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => cacheKey(entry)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));

  return `{${entries
    .map(([key, entry]) => `${JSON.stringify(key)}:${cacheKey(entry)}`)
    .join(",")}}`;
};

export const cacheGetOrSet = async <T>(
  scope: CacheScope,
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> => {
  const localKey = `${scope}:${key}`;
  const local = localCache.get(localKey);
  if (local && local.expiresAt > Date.now()) {
    return local.value as T;
  }
  if (local) localCache.delete(localKey);

  const pending = pendingLoads.get(localKey);
  if (pending) return pending as Promise<T>;

  const load = async (): Promise<T> => {
    if (!redisEnabled()) {
      return loader();
    }

  let version = "0";

  try {
    const stored = await upstashCommand(["GET", versionKey(scope)]);
    version = stored == null ? "0" : String(stored);
  } catch (error) {
    warn("read", error);
    return loader();
  }

  const fullKey = `shop:${scope}:v${version}:${key}`;

  try {
    const hit = await upstashCommand(["GET", fullKey]);

    if (typeof hit === "string") {
      return JSON.parse(hit) as T;
    }
  } catch (error) {
    warn("read", error);
    return loader();
  }

  const value = await loader();

  try {
    await upstashCommand(["SET", fullKey, JSON.stringify(value), "EX", ttlSeconds]);
  } catch (error) {
    warn("write", error);
  }

  return value;
  };

  const promise = load()
    .then((value) => {
      localCache.set(localKey, { value, expiresAt: Date.now() + LOCAL_CACHE_TTL_MS });
      return value;
    })
    .finally(() => {
      if (pendingLoads.get(localKey) === promise) pendingLoads.delete(localKey);
    });
  pendingLoads.set(localKey, promise);
  return promise;
};

export const invalidateCache = async (...scopes: CacheScope[]): Promise<void> => {
  const invalidated = new Set(scopes);
  for (const key of localCache.keys()) {
    if (invalidated.has(key.slice(0, key.indexOf(":")) as CacheScope)) {
      localCache.delete(key);
    }
  }
  for (const key of pendingLoads.keys()) {
    if (invalidated.has(key.slice(0, key.indexOf(":")) as CacheScope)) {
      pendingLoads.delete(key);
    }
  }
  if (!redisEnabled()) {
    return;
  }

  try {
    await Promise.all(scopes.map((scope) => upstashCommand(["INCR", versionKey(scope)])));
  } catch (error) {
    warn("invalidate", error);
  }
};
