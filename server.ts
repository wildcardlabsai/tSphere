import express from "express";
import { createServer as createViteServer } from "vite";
import { fetchConflictIntel, fetchOpenSkyData, fetchACLEDData } from "./src/services/intelService.js";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/intel", async (req, res) => {
    try {
      const data = await fetchConflictIntel();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch intel" });
    }
  });

  app.get("/api/traffic/air", async (req, res) => {
    try {
      const data = await fetchOpenSkyData();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch air traffic" });
    }
  });

  app.post("/api/traffic/strikes", async (req, res) => {
    const { key, email } = req.body;
    try {
      const data = await fetchACLEDData(key, email);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch strike data" });
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
    // Serve static files in production
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
