import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(import.meta.dirname, "..", "client", "index.html");

      // Always reload index.html from disk in case it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`);

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

function fileExists(p: string) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function findClientBuildDir() {
  // In production, server bundle lives in dist/, so import.meta.dirname is usually ".../dist"
  const distDir = import.meta.dirname;

  // Prefer dist/public (your original expectation), but fall back to other common outputs.
  const candidates = [
    path.resolve(distDir, "public"),                 // dist/public
    path.resolve(distDir),                           // dist  (Vite default if outDir = dist)
    path.resolve(process.cwd(), "dist", "public"),   // /opt/render/.../dist/public
    path.resolve(process.cwd(), "dist"),             // /opt/render/.../dist
  ];

  for (const dir of candidates) {
    const indexHtml = path.join(dir, "index.html");
    if (fileExists(dir) && fileExists(indexHtml)) {
      return dir;
    }
  }

  return null;
}

export function serveStatic(app: Express) {
  const clientDir = findClientBuildDir();

  if (!clientDir) {
    // Keep the error message helpful, but include all the places we checked.
    const distDir = import.meta.dirname;
    const checked = [
      path.resolve(distDir, "public"),
      path.resolve(distDir),
      path.resolve(process.cwd(), "dist", "public"),
      path.resolve(process.cwd(), "dist"),
    ];

    throw new Error(
      `Could not find the client build directory. Looked for index.html in: ${checked.join(
        ", ",
      )}. Make sure the client build runs on deploy.`,
    );
  }

  log(`Serving static client from: ${clientDir}`, "express");

  // If the client ends up in the same folder as the server bundle (dist/),
  // prevent accidentally serving the server bundle file itself.
  app.get(["/index.js", "/index.js.map"], (_req, res) => {
    res.status(404).end();
  });

  app.use(express.static(clientDir));

  // Fall through to index.html for SPA routes
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(clientDir, "index.html"));
  });
}
