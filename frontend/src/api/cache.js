const responseCache = new Map();
const inflightRequests = new Map();

function isFresh(entry) {
  return entry && entry.expiresAt > Date.now();
}

export function buildCacheKey(namespace, params = {}) {
  return `${namespace}:${JSON.stringify(params)}`;
}

export async function cachedGet(
  key,
  fetcher,
  { ttl = 15000, force = false } = {},
) {
  const cached = responseCache.get(key);
  if (!force && isFresh(cached)) {
    return cached.data;
  }

  if (!force && inflightRequests.has(key)) {
    return inflightRequests.get(key);
  }

  const request = fetcher()
    .then((data) => {
      responseCache.set(key, {
        data,
        expiresAt: Date.now() + ttl,
      });
      inflightRequests.delete(key);
      return data;
    })
    .catch((error) => {
      inflightRequests.delete(key);
      throw error;
    });

  inflightRequests.set(key, request);
  return request;
}

export function invalidateCache(matcher) {
  const matches =
    typeof matcher === "function"
      ? matcher
      : (key) => key.startsWith(String(matcher));

  for (const key of responseCache.keys()) {
    if (matches(key)) {
      responseCache.delete(key);
    }
  }

  for (const key of inflightRequests.keys()) {
    if (matches(key)) {
      inflightRequests.delete(key);
    }
  }
}

export function clearCache() {
  responseCache.clear();
  inflightRequests.clear();
}
