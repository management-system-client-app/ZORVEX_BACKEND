import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application, type Request, type Response } from "express";
import path from "node:path";
import helmet from "helmet";
import morgan from "morgan";
import { redisHealth } from "./app/config/redis";
import { env } from "./app/config/env";
import { NotFoundError } from "./app/errors/NotFoundError";
import { globalErrorHandler } from "./app/middlewares/globalErrorHandler";
import logger from "./config/logger";
import routes from "./routes";

const app: Application = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet());

const isAllowedOrigin = (origin: string): boolean => {
  if (env.ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
    || /^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i.test(origin);
};

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  }),
);

app.use(compression());
app.use(cookieParser(env.COOKIE_SECRET));

const jsonParser = express.json({ limit: "10kb" });

app.use((req, res, next) => {
  if (req.path === "/api/v1/payments/webhook") {
    next();
    return;
  }

  jsonParser(req, res, next);
});

app.use(express.urlencoded({ extended: true, limit: "10kb" }));

const morganStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

app.use(
  morgan(env.NODE_ENV === "development" ? "dev" : "combined", {
    stream: morganStream,
  }),
);

const siteUrl = env.FRONTEND_URL.replace(/\/$/, "");

app.use(
  "/assets",
  express.static(path.join(process.cwd(), "public"), {
    maxAge: "1d",
    etag: true,
    lastModified: true,
  }),
);

app.get("/", (_req: Request, res: Response) => {
  res.status(200).type("html").send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="BazerGrid is a stylish marketplace platform for discovering trending products, trusted brands, and better online shopping deals." />
    <meta name="theme-color" content="#0b1220" />
    <meta property="og:title" content="BazerGrid" />
    <meta property="og:description" content="Discover quality products, trending categories, and smarter shopping with BazerGrid." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${siteUrl}" />
    <meta property="og:image" content="${siteUrl}/assets/bazergrid-logo.svg" />
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />
    <title>BazerGrid | Smart Shopping, Better Deals</title>
    <style>
      :root {
        --bg: #081120;
        --panel: rgba(15, 23, 42, 0.88);
        --card: rgba(15, 118, 110, 0.12);
        --line: rgba(148, 163, 184, 0.2);
        --text: #e2e8f0;
        --muted: #a5b4c7;
        --primary: #22c55e;
        --secondary: #38bdf8;
      }

      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        min-height: 100%;
        font-family: Inter, "Segoe UI", sans-serif;
        background: radial-gradient(circle at top, rgba(34, 197, 94, 0.14), transparent 35%),
          linear-gradient(135deg, #020817 0%, #0b1220 50%, #111827 100%);
        color: var(--text);
      }

      body {
        display: grid;
        place-items: center;
        min-height: 100vh;
        padding: 32px 20px;
      }

      .shell {
        width: min(980px, 100%);
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid var(--line);
        border-radius: 28px;
        backdrop-filter: blur(10px);
        box-shadow: 0 30px 70px rgba(2, 6, 23, 0.7);
        overflow: hidden;
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 20px 30px;
        border-bottom: 1px solid var(--line);
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 14px;
        font-weight: 700;
        letter-spacing: 0.03em;
      }

      .brand-mark {
        width: 52px;
        height: 52px;
        border-radius: 16px;
        background: linear-gradient(135deg, var(--primary), var(--secondary));
        display: grid;
        place-items: center;
        box-shadow: 0 14px 24px rgba(56, 189, 248, 0.35);
      }

      .brand-mark span {
        font-size: 1.4rem;
        font-weight: 800;
        color: #03131b;
      }

      .badge {
        padding: 8px 12px;
        border-radius: 999px;
        border: 1px solid rgba(34, 197, 94, 0.5);
        background: rgba(34, 197, 94, 0.08);
        color: #bbf7d0;
        font-size: 0.78rem;
        font-weight: 600;
      }

      .hero {
        display: grid;
        grid-template-columns: 1.15fr 0.85fr;
        gap: 24px;
        padding: 42px 30px 28px;
      }

      .eyebrow {
        display: inline-flex;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(56, 189, 248, 0.1);
        color: #7dd3fc;
        font-size: 0.76rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-weight: 700;
      }

      h1 {
        margin: 16px 0 12px;
        font-size: clamp(2.4rem, 4vw, 4.3rem);
        line-height: 1.03;
        letter-spacing: -0.06em;
      }

      .accent {
        background: linear-gradient(90deg, #22c55e, #38bdf8);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }

      p {
        margin: 0;
        color: var(--muted);
        font-size: 1.06rem;
        line-height: 1.7;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        margin-top: 26px;
      }

      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 48px;
        padding: 0 20px;
        border-radius: 12px;
        text-decoration: none;
        font-weight: 700;
        transition: transform 0.2s ease, border-color 0.2s ease;
      }

      .button:hover { transform: translateY(-1px); }
      .button.primary {
        background: linear-gradient(135deg, #22c55e, #16a34a);
        color: #03130b;
      }

      .button.secondary {
        border: 1px solid var(--line);
        color: var(--text);
        background: rgba(15, 23, 42, 0.3);
      }

      .panel {
        background: linear-gradient(180deg, rgba(15, 118, 110, 0.22), rgba(14, 116, 144, 0.08));
        border: 1px solid rgba(96, 165, 250, 0.28);
        border-radius: 22px;
        padding: 22px;
      }

      .mini-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 14px 16px;
      }

      .mini-card + .mini-card {
        margin-top: 14px;
      }

      .metric {
        font-size: 1.8rem;
        font-weight: 800;
        letter-spacing: -0.05em;
      }

      .sub {
        color: var(--muted);
        font-size: 0.8rem;
      }

      .stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
        margin-top: 24px;
      }

      .stat {
        padding: 18px 14px;
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid var(--line);
        border-radius: 16px;
      }

      .stat strong {
        display: block;
        font-size: 1.4rem;
        margin-bottom: 6px;
      }

      @media (max-width: 760px) {
        .hero {
          grid-template-columns: 1fr;
        }

        .header {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <header class="header">
        <div class="brand">
          <div class="brand-mark" aria-label="BazerGrid logo"><span>B</span></div>
          <span>BazerGrid</span>
        </div>
        <div class="badge">Modern marketplace</div>
      </header>

      <section class="hero">
        <div>
          <div class="eyebrow">BazerGrid</div>
          <h1>Shop smarter with a <span class="accent">better grid</span>.</h1>
          <p>
            BazerGrid brings together quality products, trending categories, and trusted experiences in one clean storefront experience designed for modern shoppers.
          </p>
          <div class="actions">
            <a class="button primary" href="${siteUrl}/products">Explore products</a>
            <a class="button secondary" href="${siteUrl}/contact">Contact us</a>
          </div>
        </div>

        <aside class="panel" aria-label="Store overview">
          <div class="mini-card">
            <div>
              <div class="sub">Live catalog</div>
              <div class="metric">1.2k+</div>
            </div>
            <div class="badge">Active</div>
          </div>
          <div class="mini-card">
            <div>
              <div class="sub">Categories</div>
              <div class="metric">48</div>
            </div>
            <div class="badge">Curated</div>
          </div>
          <div class="mini-card">
            <div>
              <div class="sub">Customer trust</div>
              <div class="metric">4.9/5</div>
            </div>
            <div class="badge">Rated</div>
          </div>

          <div class="stats">
            <div class="stat"><strong>24/7</strong><span class="sub">Support</span></div>
            <div class="stat"><strong>Fast</strong><span class="sub">Delivery</span></div>
            <div class="stat"><strong>Secure</strong><span class="sub">Checkout</span></div>
          </div>
        </aside>
      </section>
    </main>
  </body>
</html>`);
});

app.get("/robots.txt", (_req: Request, res: Response) => {
  res.type("text/plain").send(`User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
});

app.get("/favicon.ico", (_req: Request, res: Response) => {
  res.redirect(302, "/assets/favicon.svg");
});

app.get("/sitemap.xml", (_req: Request, res: Response) => {
  const pages = ["/", "/products", "/categories", "/about", "/contact"];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages
    .map(
      (page) => `  <url><loc>${siteUrl}${page}</loc></url>`,
    )
    .join("\n")}
</urlset>`;

  res.type("application/xml").send(xml);
});

app.get("/health", async (_req: Request, res: Response) => {
  const redis = await redisHealth();

  res.status(200).json({
    success: true,
    status: "ok",
    redis: redis.status,
    redisDetail: redis.detail,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use(
  "/uploads",
  (_req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(process.cwd(), "uploads"), {
    maxAge: "30d",
    immutable: true,
    etag: true,
    lastModified: true,
  }),
);

// Let the CDN serve frequently requested public catalog data close to users.
// Keep search out because it is intentionally uncached and can be highly varied.
app.use("/api/v1", (req, res, next) => {
  if (req.method !== "GET") {
    next();
    return;
  }

  const publicCacheablePath =
    req.path === "/home" ||
    req.path === "/catalog" ||
    req.path === "/brands" ||
    req.path === "/categories" ||
    req.path === "/products" ||
    req.path === "/products/best-sellers";

  if (publicCacheablePath && !(req.path === "/products" && req.query.search)) {
    res.setHeader("Cache-Control", "public, s-maxage=20, stale-while-revalidate=40");
  }

  next();
});
app.use("/api/v1", routes);

app.use((req, _res, next) => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
});

app.use(globalErrorHandler);

export default app;
