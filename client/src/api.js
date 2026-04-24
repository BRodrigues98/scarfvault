/**
 * api.js — Data access layer for ScarfVault.
 *
 * All functions talk to the Express backend via fetch().
 * Components never call fetch() directly — if the API changes,
 * only this file needs updating.
 */

const BASE = "/api";

// ── Scarves ────────────────────────────────────────────────────────────────

/**
 * Load all scarves with their photo URL arrays.
 * Returns { scarves, photoMap } matching the shape App.jsx expects.
 */
export async function loadAll() {
  const res = await fetch(`${BASE}/scarves`);
  if (!res.ok) throw new Error("Failed to load scarves");
  const scarves = await res.json();

  const photoMap = {};
  scarves.forEach((s) => {
    photoMap[s.id] = s.photos || [];
  });

  // Strip the photos array off each scarf — App stores them separately
  const stripped = scarves.map(({ photos: _photos, ...s }) => s);
  return { scarves: stripped, photoMap };
}

/**
 * Create a new scarf (metadata only). Returns the created scarf with server-assigned id.
 */
export async function addScarf(scarf) {
  const res = await fetch(`${BASE}/scarves`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scarf),
  });
  if (!res.ok) throw new Error("Failed to create scarf");
  const created = await res.json();
  const { photos: _photos, ...withoutPhotos } = created;
  return withoutPhotos;
}

/**
 * Delete a scarf and all its photos (server handles file cleanup).
 */
export async function deleteScarf(id) {
  const res = await fetch(`${BASE}/scarves/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete scarf");
}

/**
 * Toggle the favourite flag for a scarf.
 * Returns { id, favorite: boolean }.
 */
export async function toggleFavorite(id) {
  const res = await fetch(`${BASE}/scarves/${id}/favorite`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to toggle favourite");
  return res.json();
}

// ── Photos ─────────────────────────────────────────────────────────────────

/**
 * Upload compressed photos (base64 data URIs) for a scarf.
 * Returns { urls: string[] } — URL paths like "/photos/123/filename.jpg"
 */
export async function uploadPhotos(scarfId, base64Photos) {
  const res = await fetch(`${BASE}/scarves/${scarfId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photos: base64Photos }),
  });
  if (!res.ok) throw new Error("Failed to upload photos");
  return res.json(); // { urls: [...] }
}

/**
 * Delete a single photo by its URL path.
 * URL format: "/photos/{scarfId}/{filename}"
 */
export async function deletePhoto(url) {
  // Convert "/photos/123/file.jpg" → DELETE /api/scarves/123/photos/file.jpg
  const parts = url.split("/").filter(Boolean); // ["photos", "123", "file.jpg"]
  const [, scarfId, filename] = parts;
  const res = await fetch(`${BASE}/scarves/${scarfId}/photos/${filename}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete photo");
}

// ── Export ─────────────────────────────────────────────────────────────────

/**
 * Build JSON export payload from in-memory data.
 * Photos are included as URL paths — to back them up, rsync data/photos/ from the server.
 */
export function buildExportPayload(scarves, photoMap) {
  return {
    exportDate: new Date().toISOString(),
    version: 5,
    note: "Photos are stored as URL paths on the server. Back up the data/photos/ directory separately.",
    scarves: scarves.map((s) => ({
      ...s,
      photoUrls: photoMap[s.id] || [],
    })),
  };
}
