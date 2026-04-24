const express = require("express");
const cors = require("cors");
const path = require("path");
const { PHOTOS_DIR } = require("./db");

const app = express();
const PORT = process.env.PORT || 3001;
const IS_DEV = process.env.NODE_ENV !== "production";

// -- Middleware -------------------------------------------------------------

// Allow Vite dev server to call the API during local development
if (IS_DEV) {
  app.use(cors({ origin: "http://localhost:5173" }));
}

// Parse JSON bodies — increase limit to handle base64 photo uploads
// 20mb covers ~12 compressed photos per request comfortably
app.use(express.json({ limit: "20mb" }));

// -- Static files -----------------------------------------------------------

// Serve uploaded photos
app.use("/photos", express.static(PHOTOS_DIR));

// Serve the built React app in production
if (!IS_DEV) {
  const CLIENT_DIST = path.join(__dirname, "..", "client", "dist");
  app.use(express.static(CLIENT_DIST));
}

// -- API routes -------------------------------------------------------------

app.use("/api/scarves", require("./routes/scarves"));

// Health check — useful for Cloudflare Tunnel / uptime monitoring
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// -- SPA fallback -----------------------------------------------------------
// Send index.html for any non-API route so client-side routing works

if (!IS_DEV) {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "client", "dist", "index.html"));
  });
}

// -- Start ------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`ScarfVault running on http://localhost:${PORT}`);
  console.log(`Environment: ${IS_DEV ? "development" : "production"}`);
});
