import { env } from "../../app/config/env";
import { AppError } from "../../app/errors/AppError";

const PRODUCT_ENDPOINT = "https://mohasagor.com/api/reseller/product";
const CACHE_TTL_MS = 60_000;

type MohasagorProductList = {
  status: number;
  products: unknown[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

type MohasagorFetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

const productCache = new Map<number, { value: MohasagorProductList; expiresAt: number }>();
const pendingRequests = new Map<number, Promise<MohasagorProductList>>();

const fetchProducts = async (page: number): Promise<MohasagorProductList> => {
  if (!env.MOHASAGOR_API_KEY || !env.MOHASAGOR_API_SECRET) {
    throw new AppError("Mohasagor API credentials are not configured", 503);
  }

  const headers = new Headers({ Accept: "application/json" });
  headers.set(env.MOHASAGOR_API_KEY_HEADER, env.MOHASAGOR_API_KEY);
  headers.set(env.MOHASAGOR_API_SECRET_HEADER, env.MOHASAGOR_API_SECRET);

  const endpoint = new URL(PRODUCT_ENDPOINT);
  endpoint.searchParams.set("page", String(page));
  const response = (await fetch(endpoint, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(15_000),
  }).catch(() => {
    throw new AppError("Could not connect to Mohasagor product API", 502);
  })) as unknown as MohasagorFetchResponse;

  if (!response.ok) {
    // Keep provider response text and credentials out of the public error response.
    if (response.status === 429) {
      const body: unknown = await response.json().catch(() => null);
      const retryAfter =
        typeof body === "object" && body !== null && "retry_after" in body
          ? Number((body as { retry_after?: unknown }).retry_after)
          : Number.NaN;
      throw new AppError(
        `Mohasagor product API returned status ${response.status}`,
        502,
        { retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60 },
      );
    }

    throw new AppError(`Mohasagor product API returned status ${response.status}`, 502);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new AppError("Mohasagor product API returned invalid JSON", 502);
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !Array.isArray((body as { products?: unknown }).products)
  ) {
    throw new AppError("Mohasagor product API response has an unexpected format", 502);
  }

  const result = body as {
    status?: unknown;
    current_page?: unknown;
    last_page?: unknown;
    per_page?: unknown;
    total?: unknown;
    products: unknown[];
  };
  return {
    status: typeof result.status === "number" ? result.status : response.status,
    products: result.products,
    meta: {
      page: typeof result.current_page === "number" ? result.current_page : page,
      limit: typeof result.per_page === "number" ? result.per_page : result.products.length,
      total: typeof result.total === "number" ? result.total : result.products.length,
      totalPages: typeof result.last_page === "number" ? result.last_page : 1,
    },
  };
};

const getProducts = async (page = 1): Promise<MohasagorProductList> => {
  const cached = productCache.get(page);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  let pendingRequest = pendingRequests.get(page);
  if (!pendingRequest) {
    pendingRequest = fetchProducts(page)
      .then((value) => {
        productCache.set(page, { value, expiresAt: Date.now() + CACHE_TTL_MS });
        return value;
      })
      .finally(() => {
        pendingRequests.delete(page);
      });
    pendingRequests.set(page, pendingRequest);
  }

  return pendingRequest;
};

export const mohasagorService = { getProducts };
