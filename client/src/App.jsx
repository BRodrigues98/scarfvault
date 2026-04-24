import { useState, useEffect, useRef } from "react";
import ScarfCard from "./components/ScarfCard";
import ScarfRow from "./components/ScarfRow";
import TagInput from "./components/TagInput";
import {
  loadAll, addScarf, deleteScarf, toggleFavorite,
  uploadPhotos, buildExportPayload,
} from "./api";
import { LEAGUES, TYPES, CONDITIONS, ACQUIRED, FLAGS, BLANK_FORM } from "./constants";
import { levenshtein, compressImage, typeIcon } from "./utils";
import "./index.css";

export default function App() {
  const [scarves, setScarves] = useState([]);
  const [photoMap, setPhotoMap] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  // UI state
  const [tab, setTab] = useState("col");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [saving, setSaving] = useState(false);

  // Autocomplete / "did you mean"
  const [autocomplete, setAutocomplete] = useState([]);
  const [showAC, setShowAC] = useState(false);
  const [didYouMean, setDidYouMean] = useState(null);

  // Filters & display
  const [view, setView] = useState("grid");
  const [sortBy, setSortBy] = useState("fav");
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState("All");
  const [filterLeague, setFilterLeague] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterTag, setFilterTag] = useState("All");
  const [favOnly, setFavOnly] = useState(false);

  const photoInputRef = useRef(null);

  // ── Load from server ──────────────────────────────────────────────────────

  useEffect(() => {
    loadAll()
      .then(({ scarves, photoMap }) => {
        setScarves(scarves);
        setPhotoMap(photoMap);
        setLoaded(true);
      })
      .catch((err) => {
        console.error(err);
        setError("Could not connect to the server. Is it running?");
        setLoaded(true);
      });
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────────

  const existingClubs = [...new Set(scarves.map((s) => s.club))];
  const allTags = [...new Set(scarves.flatMap((s) => s.tags || []))];
  const allCountries = ["All", ...new Set(scarves.map((s) => s.country).filter(Boolean))].sort();
  const allLeagues = ["All", ...new Set(scarves.map((s) => s.league).filter(Boolean))].sort();
  const nCollection = scarves.filter((s) => !s.isWish).length;
  const nWishlist = scarves.filter((s) => s.isWish).length;
  const nFavs = scarves.filter((s) => !s.isWish && s.favorite).length;

  // ── Autocomplete ──────────────────────────────────────────────────────────

  const handleClubInput = (value) => {
    setForm((f) => ({ ...f, club: value }));
    setDidYouMean(null);
    if (value.length > 0) {
      const matches = existingClubs.filter(
        (n) => n.toLowerCase().includes(value.toLowerCase()) && n.toLowerCase() !== value.toLowerCase()
      );
      setAutocomplete(matches.slice(0, 6));
      setShowAC(matches.length > 0);
    } else {
      setAutocomplete([]);
      setShowAC(false);
    }
  };

  const handleClubBlur = () => {
    setTimeout(() => setShowAC(false), 200);
    const val = form.club.trim();
    if (!val || existingClubs.map((n) => n.toLowerCase()).includes(val.toLowerCase())) return;
    const close = existingClubs
      .map((n) => ({ n, d: levenshtein(val, n) }))
      .filter((x) => x.d <= 2 && x.d > 0)
      .sort((a, b) => a.d - b.d);
    if (close.length > 0) setDidYouMean(close[0].n);
  };

  // ── Photo upload ──────────────────────────────────────────────────────────

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    const compressed = await Promise.all(files.map(compressImage));
    setPendingPhotos((prev) => [...prev, ...compressed]);
    e.target.value = "";
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!form.club.trim() || !form.country.trim()) return;
    setSaving(true);
    try {
      // 1. Create scarf metadata — server assigns the id
      const created = await addScarf({ ...form, club: form.club.trim(), isWish: tab === "wish" });

      // 2. Upload photos if any
      let photoUrls = [];
      if (pendingPhotos.length > 0) {
        const result = await uploadPhotos(created.id, pendingPhotos);
        photoUrls = result.urls;
      }

      // 3. Update local state
      setScarves((prev) => [created, ...prev]);
      setPhotoMap((pm) => ({ ...pm, [created.id]: photoUrls }));

      // 4. Reset form
      setForm(BLANK_FORM);
      setPendingPhotos([]);
      setDidYouMean(null);
      setShowAC(false);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save scarf. Check the server logs.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteScarf(id);
      setScarves((prev) => prev.filter((s) => s.id !== id));
      setPhotoMap((pm) => { const n = { ...pm }; delete n[id]; return n; });
    } catch (err) {
      console.error(err);
      alert("Failed to delete scarf.");
    }
  };

  const handleToggleFavorite = async (id) => {
    // Optimistic update for instant UI response
    setScarves((prev) =>
      prev.map((s) => (s.id === id ? { ...s, favorite: !s.favorite } : s))
    );
    try {
      await toggleFavorite(id);
    } catch (err) {
      // Revert on failure
      console.error(err);
      setScarves((prev) =>
        prev.map((s) => (s.id === id ? { ...s, favorite: !s.favorite } : s))
      );
    }
  };

  // ── Sorting & filtering ───────────────────────────────────────────────────

  const sortScarves = (arr) => {
    const copy = [...arr];
    switch (sortBy) {
      case "fav":     return copy.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));
      case "alpha":   return copy.sort((a, b) => a.club.localeCompare(b.club));
      case "year":    return copy.sort((a, b) => (b.year || 0) - (a.year || 0));
      case "country": return copy.sort((a, b) => a.country.localeCompare(b.country));
      case "cond": {
        const order = { Mint: 0, Good: 1, Worn: 2, Poor: 3 };
        return copy.sort((a, b) => (order[a.condition] ?? 9) - (order[b.condition] ?? 9));
      }
      default: return copy;
    }
  };

  const visible = sortScarves(
    scarves.filter((s) => {
      if (tab === "col" && s.isWish) return false;
      if (tab === "wish" && !s.isWish) return false;
      if (favOnly && !s.favorite) return false;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        s.club.toLowerCase().includes(q) ||
        s.country.toLowerCase().includes(q) ||
        (s.notes || "").toLowerCase().includes(q) ||
        (s.playerName || "").toLowerCase().includes(q) ||
        (s.fixture || "").toLowerCase().includes(q) ||
        (s.tags || []).some((t) => t.toLowerCase().includes(q));
      return (
        matchSearch &&
        (filterCountry === "All" || s.country === filterCountry) &&
        (filterLeague === "All" || s.league === filterLeague) &&
        (filterType === "All" || s.type === filterType) &&
        (filterTag === "All" || (s.tags || []).includes(filterTag))
      );
    })
  );

  // ── Exports ───────────────────────────────────────────────────────────────

  const exportJSON = () => {
    const payload = buildExportPayload(scarves, photoMap);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "scarfvault.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const headers = [
      "Club", "Country", "League", "Type", "Player Name", "Fixture",
      "Condition", "How Acquired", "Year", "Tags", "Notes",
      "Color1", "Color2", "Favourite", "Wishlist", "Photo Count",
    ];
    const rows = scarves.map((s) =>
      [
        s.club, s.country, s.league || "", s.type || "",
        s.playerName || "", s.fixture || "",
        s.condition || "", s.acquired || "", s.year || "",
        (s.tags || []).join("; "),
        (s.notes || "").replace(/"/g, '""'),
        s.color1 || "", s.color2 || "",
        s.favorite ? "Yes" : "No",
        s.isWish ? "Yes" : "No",
        (photoMap[s.id] || []).length,
      ]
        .map((v) => `"${v}"`)
        .join(",")
    );
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "scarfvault.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (!loaded) {
    return (
      <div style={{ background: "#0a0f1a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#3a5070", fontFamily: "sans-serif" }}>
        Loading vault…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: "#0a0f1a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#e04040", fontFamily: "sans-serif", padding: "20px", textAlign: "center" }}>
        {error}
      </div>
    );
  }

  return (
    <div className="vault">

      {/* Header */}
      <div className="header">
        <div className="header-top">
          <div className="logo">
            <span style={{ fontSize: "1.5rem" }}>🧣</span>
            <span className="logo-text">Scarf<span>Vault</span></span>
            {scarves.length > 0 && <span className="count-badge">{scarves.length}</span>}
          </div>
          <div className="header-right">
            <button className="btn-export" onClick={exportCSV} title="Metadata only — no photos">↓ CSV</button>
            <button className="btn-export" onClick={exportJSON} title="Full backup — includes photo URLs">↓ JSON</button>
            <button className="btn-add-main" onClick={() => setShowForm((v) => !v)}>
              {showForm ? "✕ Cancel" : tab === "wish" ? "+ Add to Wishlist" : "+ Add Scarf"}
            </button>
          </div>
        </div>
        {scarves.length > 0 && (
          <div className="stats-row">
            <span className="stat"><strong>{nCollection}</strong> in collection</span>
            <span className="stat"><strong>{nWishlist}</strong> on wishlist</span>
            <span className="stat fav-stat"><strong>★ {nFavs}</strong> favourites</span>
            <span className="stat">
              <strong>{new Set(scarves.filter((s) => !s.isWish).map((s) => s.country).filter(Boolean)).size}</strong> countries
            </span>
            <span className="stat">
              <strong>{new Set(scarves.filter((s) => !s.isWish).map((s) => s.club)).size}</strong> clubs / NTs
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn${tab === "col" ? " active" : ""}`} onClick={() => setTab("col")}>
          🧣 Collection<span className="tab-count">({nCollection})</span>
        </button>
        <button className={`tab-btn${tab === "wish" ? " active" : ""}`} onClick={() => setTab("wish")}>
          ⭐ Wishlist<span className="tab-count">({nWishlist})</span>
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="form-panel">
          <div className="form-title">{tab === "wish" ? "⭐ Add to Wishlist" : "📋 New Entry"}</div>
          <div className="form-grid">

            <div className="form-group full">
              <label className="form-label">Club / National Team *</label>
              <div className="ac-wrap">
                <input
                  className="form-input"
                  placeholder="e.g. S.L. Benfica"
                  value={form.club}
                  onChange={(e) => handleClubInput(e.target.value)}
                  onBlur={handleClubBlur}
                  autoComplete="off"
                />
                {showAC && autocomplete.length > 0 && (
                  <div className="ac-dropdown">
                    {autocomplete.map((name) => (
                      <div
                        key={name}
                        className="ac-option"
                        onMouseDown={() => {
                          setForm((f) => ({ ...f, club: name }));
                          setAutocomplete([]); setShowAC(false); setDidYouMean(null);
                        }}
                      >
                        🧣 {name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {didYouMean && (
                <div className="dym-hint">
                  ⚠️ Did you mean{" "}
                  <button
                    className="dym-btn"
                    onClick={() => { setForm((f) => ({ ...f, club: didYouMean })); setDidYouMean(null); }}
                  >
                    {didYouMean}
                  </button>?
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Country *</label>
              <input
                className="form-input" list="country-list" placeholder="e.g. Portugal"
                value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              />
              <datalist id="country-list">
                {Object.keys(FLAGS).map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div className="form-group">
              <label className="form-label">Competition / League</label>
              <select className="form-select" value={form.league} onChange={(e) => setForm((f) => ({ ...f, league: e.target.value }))}>
                <option value="">— Select —</option>
                {LEAGUES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Type</label>
              <select
                className="form-select" value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value, playerName: "", fixture: "" }))}
              >
                {TYPES.map((t) => <option key={t} value={t}>{typeIcon(t)} {t}</option>)}
              </select>
            </div>

            {form.type === "Player" && (
              <div className="form-group context-field">
                <label className="form-label">Player Name</label>
                <input
                  className="form-input" placeholder="e.g. Eusébio"
                  value={form.playerName} onChange={(e) => setForm((f) => ({ ...f, playerName: e.target.value }))}
                />
              </div>
            )}

            {form.type === "Match Scarf" && (
              <div className="form-group context-field">
                <label className="form-label">Fixture</label>
                <input
                  className="form-input" placeholder="e.g. Benfica vs Porto · 12 Apr 2024"
                  value={form.fixture} onChange={(e) => setForm((f) => ({ ...f, fixture: e.target.value }))}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Condition</label>
              <select className="form-select" value={form.condition} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">How Acquired</label>
              <select className="form-select" value={form.acquired} onChange={(e) => setForm((f) => ({ ...f, acquired: e.target.value }))}>
                <option value="">— Select —</option>
                {ACQUIRED.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Year Acquired</label>
              <input
                className="form-input" type="number" placeholder="e.g. 2023"
                min="1900" max={new Date().getFullYear()}
                value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Club Colours</label>
              <div className="color-pair">
                <div className="color-item">
                  <label>Primary</label>
                  <input type="color" value={form.color1} onChange={(e) => setForm((f) => ({ ...f, color1: e.target.value }))} />
                </div>
                <div className="color-item">
                  <label>Secondary</label>
                  <input type="color" value={form.color2} onChange={(e) => setForm((f) => ({ ...f, color2: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Favourite</label>
              <div className="fav-form-row">
                <label className="fav-toggle">
                  <input
                    type="checkbox" checked={form.favorite}
                    onChange={(e) => setForm((f) => ({ ...f, favorite: e.target.checked }))}
                  />
                  <span className="fav-star-label">★</span>
                </label>
                <span className="fav-toggle-text">
                  {form.favorite ? "Marked as favourite" : "Mark as favourite"}
                </span>
              </div>
            </div>

            <div className="form-group full">
              <label className="form-label">
                Tags <span className="hint">(Enter or comma to add — suggestions appear as you type)</span>
              </label>
              <TagInput
                tags={form.tags}
                onChange={(tags) => setForm((f) => ({ ...f, tags }))}
                allTags={allTags}
              />
            </div>

            <div className="form-group full">
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                placeholder="e.g. Bought at Estádio da Luz, matchday vs Porto"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="form-group full">
              <label className="form-label">
                Photos <span className="hint">(multiple allowed — auto-compressed before upload)</span>
              </label>
              <div className="photo-upload" onClick={() => photoInputRef.current?.click()}>
                <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} />
                <div className="photo-upload-inner">
                  <span style={{ fontSize: "1.1rem" }}>📷</span>
                  <span className="photo-upload-label">
                    {pendingPhotos.length > 0
                      ? `${pendingPhotos.length} photo${pendingPhotos.length > 1 ? "s" : ""} ready — click to add more`
                      : "Click to add photos"}
                  </span>
                </div>
              </div>
              {pendingPhotos.length > 0 && (
                <div className="photo-previews">
                  {pendingPhotos.map((src, i) => (
                    <div key={i} className="photo-thumb">
                      <img src={src} alt="" />
                      <button
                        className="photo-thumb-remove"
                        onClick={() => setPendingPhotos((ps) => ps.filter((_, j) => j !== i))}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
          <div className="form-actions">
            <button className="btn-submit" onClick={handleAdd} disabled={saving}>
              {saving ? "Saving…" : "Add to Vault"}
            </button>
            <button
              className="btn-cancel"
              onClick={() => { setShowForm(false); setForm(BLANK_FORM); setPendingPhotos([]); setDidYouMean(null); }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      {scarves.length > 0 && (
        <div className="filter-bar">
          <input
            className="search-input"
            placeholder="🔍 Search clubs, players, tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="filter-select" value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)}>
            {allCountries.map((c) => <option key={c} value={c}>{c === "All" ? "All Countries" : c}</option>)}
          </select>
          <select className="filter-select" value={filterLeague} onChange={(e) => setFilterLeague(e.target.value)}>
            {allLeagues.map((l) => <option key={l} value={l}>{l === "All" ? "All Competitions" : l}</option>)}
          </select>
          <select className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="All">All Types</option>
            {TYPES.map((t) => <option key={t} value={t}>{typeIcon(t)} {t}</option>)}
          </select>
          {allTags.length > 0 && (
            <select className="filter-select" value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
              <option value="All">All Tags</option>
              {allTags.sort().map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <select className="filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="fav">Sort: Favourites first</option>
            <option value="ins">Sort: Recent</option>
            <option value="alpha">Sort: A – Z</option>
            <option value="year">Sort: Year ↓</option>
            <option value="country">Sort: Country</option>
            <option value="cond">Sort: Condition</option>
          </select>
          <button className={`fav-filter-btn${favOnly ? " on" : ""}`} onClick={() => setFavOnly((v) => !v)}>
            ★ {favOnly ? "Favourites" : "All"}
          </button>
          <button className={`view-btn${view === "grid" ? " active" : ""}`} title="Grid view" onClick={() => setView("grid")}>⊞</button>
          <button className={`view-btn${view === "list" ? " active" : ""}`} title="List view" onClick={() => setView("list")}>☰</button>
        </div>
      )}

      {/* Content */}
      <div className="content">
        {visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">{favOnly ? "★" : tab === "wish" ? "⭐" : "🧣"}</div>
            <div className="empty-title">
              {favOnly
                ? "No favourites yet"
                : tab === "wish"
                ? "Wishlist is empty"
                : scarves.length === 0
                ? "The Vault is Empty"
                : "No matches found"}
            </div>
            <div className="empty-sub">
              {favOnly
                ? "Star a scarf to mark it as a favourite"
                : tab === "wish"
                ? "Add scarves you're hunting for"
                : scarves.length === 0
                ? "Hit '+ Add Scarf' to get started"
                : "Try adjusting your filters"}
            </div>
          </div>
        ) : (
          <>
            <div className="results-label">
              Showing <span>{visible.length}</span> of {tab === "col" ? nCollection : nWishlist}
            </div>
            {view === "grid" ? (
              <div className="card-grid">
                {visible.map((s, i) => (
                  <ScarfCard
                    key={s.id} scarf={s} photos={photoMap[s.id] || []}
                    onDelete={handleDelete} onToggleFavorite={handleToggleFavorite} animIdx={i}
                  />
                ))}
              </div>
            ) : (
              <div className="list-view">
                {visible.map((s) => (
                  <ScarfRow
                    key={s.id} scarf={s} photos={photoMap[s.id] || []}
                    onDelete={handleDelete} onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
