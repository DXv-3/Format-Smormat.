import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import worker from "./worker/src/index";
import dotenv from "dotenv";

dotenv.config();

// Create a web standard Request from an Express Request
function createWebRequest(req: express.Request): Request {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else {
        headers.append(key, value as string);
      }
    }
  }

  // Get raw body for POST requests
  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
    init.body = req.body;
  }

  return new Request(url.toString(), init);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // We need raw body for the web request
  app.use(express.raw({ type: '*/*', limit: '50mb' }));

  // Mock the Cloudflare Env
  const env = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "*",
  };
  
  console.log("Using API Key:", env.GEMINI_API_KEY ? `Set (${env.GEMINI_API_KEY.length} chars)` : "Not Set");

  // API route mapping
  app.all('/api', async (req, res) => {
    try {
      const webReq = createWebRequest(req);
      const webRes = await worker.fetch(webReq, env as any);

      // Convert web response back to Express response
      webRes.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      res.status(webRes.status);
      
      const buffer = await webRes.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (e) {
      console.error(e);
      res.status(500).send("Internal Server Error");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // In express 5 we can use * or *all but * usually works. Express 5 uses path-to-regexp v8 where * is handled differently.
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
