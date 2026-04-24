const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "scarfvault.db");
const PHOTOS_DIR = path.join(DATA_DIR, "photos");

// Ensure directories exist on startup
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(PHOTOS_DIR, { recursive: true });

const db = new Database(DB_PATH);

// WAL mode: better read concurrency, safer writes
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS scarves (
    id          INTEGER PRIMARY KEY,
    club        TEXT    NOT NULL,
    country     TEXT    NOT NULL,
    league      TEXT,
    type        TEXT,
    condition   TEXT,
    acquired    TEXT,
    year        TEXT,
    notes       TEXT,
    color1      TEXT,
    color2      TEXT,
    player_name TEXT,
    fixture     TEXT,
    tags        TEXT    NOT NULL DEFAULT '[]',
    favorite    INTEGER NOT NULL DEFAULT 0,
    is_wish     INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS photos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    scarf_id   INTEGER NOT NULL,
    filename   TEXT    NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (scarf_id) REFERENCES scarves(id) ON DELETE CASCADE
  );
`);

/**
 * Convert a DB row (snake_case, integers for booleans) to a JS object
 * matching the shape the React app expects.
 */
function rowToScarf(row) {
  return {
    id:         row.id,
    club:       row.club,
    country:    row.country,
    league:     row.league     || "",
    type:       row.type       || "Club Colors",
    condition:  row.condition  || "",
    acquired:   row.acquired   || "",
    year:       row.year       || "",
    notes:      row.notes      || "",
    color1:     row.color1     || "#c8102e",
    color2:     row.color2     || "#ffffff",
    playerName: row.player_name || "",
    fixture:    row.fixture    || "",
    tags:       JSON.parse(row.tags || "[]"),
    favorite:   row.favorite === 1,
    isWish:     row.is_wish   === 1,
    createdAt:  row.created_at,
  };
}

// Prepared statements (compiled once, reused)
const stmts = {
  listScarves:   db.prepare("SELECT * FROM scarves ORDER BY created_at DESC"),
  getScarfById:  db.prepare("SELECT * FROM scarves WHERE id = ?"),
  insertScarf:   db.prepare(`
    INSERT INTO scarves
      (id, club, country, league, type, condition, acquired, year, notes,
       color1, color2, player_name, fixture, tags, favorite, is_wish, created_at)
    VALUES
      (@id, @club, @country, @league, @type, @condition, @acquired, @year, @notes,
       @color1, @color2, @playerName, @fixture, @tags, @favorite, @isWish, @createdAt)
  `),
  deleteScarf:   db.prepare("DELETE FROM scarves WHERE id = ?"),
  toggleFav:     db.prepare("UPDATE scarves SET favorite = ((favorite | 1) - (favorite & 1)) WHERE id = ?"),
  getFavState:   db.prepare("SELECT favorite FROM scarves WHERE id = ?"),

  getPhotos:     db.prepare("SELECT * FROM photos WHERE scarf_id = ? ORDER BY sort_order"),
  insertPhoto:   db.prepare("INSERT INTO photos (scarf_id, filename, sort_order) VALUES (?, ?, ?)"),
  deletePhoto:   db.prepare("DELETE FROM photos WHERE scarf_id = ? AND filename = ?"),
  deleteAllPhotos: db.prepare("DELETE FROM photos WHERE scarf_id = ?"),
  maxSortOrder:  db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS max FROM photos WHERE scarf_id = ?"),
};

module.exports = { db, stmts, rowToScarf, PHOTOS_DIR };
