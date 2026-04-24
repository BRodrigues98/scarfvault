import { useState } from "react";
import Lightbox from "./Lightbox";
import { FLAGS, COND_COLORS } from "../constants";
import { typeIcon } from "../utils";

/**
 * Grid card view for a single scarf.
 * Shows photo thumbnail, stripe bar in club colours, type chip,
 * condition dot, favourite star, tags, and contextual subtitle
 * (player name or match fixture depending on type).
 */
export default function ScarfCard({ scarf, photos, onDelete, onToggleFavorite, animIdx }) {
  const [confirming, setConfirming] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const subtitle =
    scarf.type === "Player" && scarf.playerName
      ? scarf.playerName
      : scarf.type === "Match Scarf" && scarf.fixture
      ? scarf.fixture
      : null;

  return (
    <>
      {lightbox !== null && (
        <Lightbox photos={photos} start={lightbox} onClose={() => setLightbox(null)} />
      )}

      <div
        className={`card${scarf.favorite ? " card-fav" : ""}`}
        style={{
          animationDelay: `${animIdx * 0.04}s`,
          "--c1": scarf.color1 || "#c8102e",
          "--c2": scarf.color2 || "#fff",
        }}
      >
        {/* Club colour stripe */}
        <div className="stripe-bar">
          <div className="stripe s1" /><div className="stripe s2" />
          <div className="stripe s1" /><div className="stripe s2" />
          <div className="stripe s1" />
        </div>

        {/* Photo thumbnail */}
        {photos.length > 0 && (
          <div className="card-photo" onClick={() => setLightbox(0)}>
            <img src={photos[0]} className="card-photo-img" alt="" />
            {photos.length > 1 && (
              <span className="card-photo-more">
                +{photos.length - 1} photo{photos.length > 2 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        <div className="card-body">
          <div className="card-top">
            <span className="flag">{FLAGS[scarf.country] || "🏳️"}</span>
            <div className="card-top-right">
              {scarf.condition && (
                <span
                  className="cond-dot"
                  style={{ background: COND_COLORS[scarf.condition] }}
                  title={scarf.condition}
                />
              )}
              <span className="type-chip">{typeIcon(scarf.type)} {scarf.type}</span>
              <button
                className={`fav-btn${scarf.favorite ? " fav-on" : ""}`}
                onClick={() => onToggleFavorite(scarf.id)}
                title={scarf.favorite ? "Remove from favourites" : "Mark as favourite"}
              >
                ★
              </button>
            </div>
          </div>

          <h3 className="club-name">{scarf.club}</h3>
          {subtitle && <div className="card-subtitle">{subtitle}</div>}

          <div className="meta-row">
            <span>{scarf.country}</span>
            {scarf.league && <><span className="sep">·</span><span>{scarf.league}</span></>}
            {scarf.year && <><span className="sep">·</span><span>{scarf.year}</span></>}
          </div>

          {(scarf.condition || scarf.acquired) && (
            <div className="cond-row">
              {scarf.condition && (
                <span className="cond-label" style={{ color: COND_COLORS[scarf.condition] }}>
                  {scarf.condition}
                </span>
              )}
              {scarf.condition && scarf.acquired && <span className="sep">·</span>}
              {scarf.acquired && <span className="acquired-txt">📦 {scarf.acquired}</span>}
            </div>
          )}

          {scarf.tags?.length > 0 && (
            <div className="card-tags">
              {scarf.tags.map((tag) => (
                <span key={tag} className="card-tag">{tag}</span>
              ))}
            </div>
          )}

          {scarf.notes && <p className="card-notes">"{scarf.notes}"</p>}
        </div>

        <div className="card-footer">
          {confirming ? (
            <div className="confirm-row">
              <span>Remove?</span>
              <button className="btn-yes" onClick={() => onDelete(scarf.id)}>Yes</button>
              <button className="btn-no" onClick={() => setConfirming(false)}>No</button>
            </div>
          ) : (
            <button className="btn-delete" onClick={() => setConfirming(true)}>✕ Remove</button>
          )}
        </div>
      </div>
    </>
  );
}
