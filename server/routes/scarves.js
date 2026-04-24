const express = require("express");
const router = express.Router();
const { stmts, rowToScarf, PHOTOS_DIR } = require("../db");
const path = require("path");
const fs = require("fs");

// -- Helpers ----------------------------------------------------------------

/** Attach photo URLs to a formatted scarf object. */
function withPhotos(scarf) {
  const rows = stmts.getPhotos.all(scarf.id);
  return {
    ...scarf,
    photos: rows.map((p) => `/photos/${scarf.id}/${p.filename}`),
  };
}

// -- GET /api/scarves -------------------------------------------------------

router.get("/", (req, res) => {
  try {
    const rows = stmts.listScarves.all();
    const scarves = rows.map((row) => withPhotos(rowToScarf(row)));
    res.json(scarves);
  } catch (err) {
    console.error("GET /api/scarves", err);
    res.status(500).json({ error: "Failed to load scarves" });
  }
});

// -- POST /api/scarves ------------------------------------------------------

router.post("/", (req, res) => {
  try {
    const body = req.body;
    const id = Date.now();

    stmts.insertScarf.run({
      id,
      club:        body.club?.trim() || "",
      country:     body.country?.trim() || "",
      league:      body.league      || "",
      type:        body.type        || "Club Colors",
      condition:   body.condition   || "",
      acquired:    body.acquired    || "",
      year:        body.year        || "",
      notes:       body.notes       || "",
      color1:      body.color1      || "#c8102e",
      color2:      body.color2      || "#ffffff",
      playerName:  body.playerName  || "",
      fixture:     body.fixture     || "",
      tags:        JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
      favorite:    body.favorite    ? 1 : 0,
      isWish:      body.isWish      ? 1 : 0,
      createdAt:   id,
    });

    const created = rowToScarf(stmts.getScarfById.get(id));
    res.status(201).json(withPhotos(created));
  } catch (err) {
    console.error("POST /api/scarves", err);
    res.status(500).json({ error: "Failed to create scarf" });
  }
});

// -- DELETE /api/scarves/:id ------------------------------------------------

router.delete("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    // Delete photo files from disk before removing DB rows
    const photoDir = path.join(PHOTOS_DIR, String(id));
    if (fs.existsSync(photoDir)) {
      fs.rmSync(photoDir, { recursive: true, force: true });
    }

    stmts.deleteScarf.run(id); // CASCADE deletes photos rows too
    res.status(204).end();
  } catch (err) {
    console.error("DELETE /api/scarves/:id", err);
    res.status(500).json({ error: "Failed to delete scarf" });
  }
});

// -- PATCH /api/scarves/:id/favorite ---------------------------------------

router.patch("/:id/favorite", (req, res) => {
  try {
    const id = Number(req.params.id);
    stmts.toggleFav.run(id);
    const row = stmts.getScarfById.get(id);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ id, favorite: row.favorite === 1 });
  } catch (err) {
    console.error("PATCH /api/scarves/:id/favorite", err);
    res.status(500).json({ error: "Failed to toggle favourite" });
  }
});

// -- PATCH /api/scarves/:id -------------------------------------------------

router.patch("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body;

    const existing = stmts.getScarfById.get(id);
    if(!existing) return res.status(404).json({ error: "Not Found" });

    stmts.updateScarf.run({
      id,
      club:       body.club?.trim()       || existing.club,
      country:    body.country?.trim()    || existing.country,
      league:     body.league             ?? existing.league,
      type:       body.type               ?? existing.type,
      condition:  body.condition          ?? existing.condition,
      acquired:   body.acquired           ?? existing.acquired,
      year:       body.year               ?? existing.year,
      notes:      body.notes              ?? existing.notes,
      color1:     body.color1             ?? existing.color1,
      color2:     body.color2             ?? existing.color2,
      playerName: body.playerName         ?? existing.player_name,
      fixture:    body.fixture            ?? existing.fixture,
      tags:       JSON.stringify(Array.isArray(body.tags) ? body.tags : JSON.parse(existing.tags || "[]")),
      favorite:   body.favorite !== undefined ? (body.favorite ? 1 : 0) : existing.favorite,
      isWish:     body.isWish   !== undefined ? (body.isWish   ? 1 : 0) : existing.is_wish,
    });

    const updated = rowToScarf(stmts.getScarfById.get(id));
    res.json(withPhotos(updated));
  } catch(err) {
    console.error("PATCH /api/scarves/:id", err);
    res.status(500).json({ error: "Failed to update scarf" });
  }
})

// -- POST /api/scarves/:id/photos -------------------------------------------
// Body: { photos: ["data:image/jpeg;base64,...", ...] }
// Returns: { urls: ["/photos/id/filename.jpg", ...] }

router.post("/:id/photos", (req, res) => {
  try {
    const id = Number(req.params.id);
    const photos = req.body.photos;

    if (!Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({ error: "photos array required" });
    }

    const photoDir = path.join(PHOTOS_DIR, String(id));
    fs.mkdirSync(photoDir, { recursive: true });

    const { max } = stmts.maxSortOrder.get(id);
    let sortOrder = max + 1;
    const urls = [];

    for (const dataUri of photos) {
      // Strip data URI prefix: "data:image/jpeg;base64,<data>"
      const base64Data = dataUri.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const filename = `${Date.now()}_${sortOrder}.jpg`;
      const filePath = path.join(photoDir, filename);

      fs.writeFileSync(filePath, buffer);
      stmts.insertPhoto.run(id, filename, sortOrder);
      urls.push(`/photos/${id}/${filename}`);
      sortOrder++;
    }

    res.status(201).json({ urls });
  } catch (err) {
    console.error("POST /api/scarves/:id/photos", err);
    res.status(500).json({ error: "Failed to upload photos" });
  }
});

// -- DELETE /api/scarves/:id/photos/:filename -------------------------------

router.delete("/:id/photos/:filename", (req, res) => {
  try {
    const id = Number(req.params.id);
    const { filename } = req.params;

    // Sanitise filename — prevent path traversal
    const safe = path.basename(filename);
    const filePath = path.join(PHOTOS_DIR, String(id), safe);

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    stmts.deletePhoto.run(id, safe);

    res.status(204).end();
  } catch (err) {
    console.error("DELETE /api/scarves/:id/photos/:filename", err);
    res.status(500).json({ error: "Failed to delete photo" });
  }
});

module.exports = router;
