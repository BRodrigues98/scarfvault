import { useState } from "react";
import Lightbox from "./Lightbox";
import { FLAGS, COND_COLORS } from "../constants";
import { typeIcon } from "../utils";

/**
 * Compact list row view for a single scarf.
 * Shows thumbnail (or flag emoji fallback), club name, contextual subtitle,
 * tag pills (first 3 + overflow count), type chip, condition dot, and fav star.
 */
export default function ScarfRow({
  scarf,
  photos,
  onDelete,
  onEdit,
  onToggleFavorite,
}) {
  const [confirming, setConfirming] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const subtitle =
    scarf.type === "Player" && scarf.playerName
      ? `👤 ${scarf.playerName}`
      : scarf.type === "Match Scarf" && scarf.fixture
        ? `🏟️ ${scarf.fixture}`
        : null;

  const metaLine = subtitle
    ? subtitle
    : `${scarf.country}${scarf.league ? ` · ${scarf.league}` : ""}${scarf.year ? ` · ${scarf.year}` : ""}`;

  return (
    <>
      {lightbox !== null && (
        <Lightbox
          photos={photos}
          start={lightbox}
          onClose={() => setLightbox(null)}
        />
      )}

      <div
        className={`list-row${scarf.favorite ? " row-fav" : ""}`}
        style={{
          "--c1": scarf.color1 || "#c8102e",
          "--c2": scarf.color2 || "#fff",
        }}
      >
        {/* Colour stripe */}
        <div className="row-bar">
          <div className="stripe s1" />
          <div className="stripe s2" />
          <div className="stripe s1" />
        </div>

        {/* Thumbnail or flag */}
        {photos.length > 0 ? (
          <div className="row-thumb-wrap" onClick={() => setLightbox(0)}>
            <img src={photos[0]} className="row-thumb" alt="" />
            {photos.length > 1 && (
              <span className="row-thumb-n">+{photos.length - 1}</span>
            )}
          </div>
        ) : (
          <div className="row-flag">{FLAGS[scarf.country] || "🏳️"}</div>
        )}

        {/* Info */}
        <div className="row-info">
          <div className="row-name-line">
            <span className="row-name">{scarf.club}</span>
            {scarf.favorite && <span className="row-fav-star">★</span>}
          </div>
          <span className="row-meta">{metaLine}</span>
          {scarf.tags?.length > 0 && (
            <div className="row-tags-pills">
              {scarf.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="card-tag">
                  {tag}
                </span>
              ))}
              {scarf.tags.length > 3 && (
                <span className="card-tag tag-more">
                  +{scarf.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="row-actions">
          <span className="type-chip">
            {typeIcon(scarf.type)} {scarf.type}
          </span>
          {scarf.condition && (
            <span
              className="cond-dot"
              style={{ background: COND_COLORS[scarf.condition] }}
              title={scarf.condition}
            />
          )}
          <button
            className={`fav-btn${scarf.favorite ? " fav-on" : ""}`}
            onClick={() => onToggleFavorite(scarf.id)}
            title="Toggle favourite"
          >
            ★
          </button>
        </div>

        <div className="row-del">
          {confirming ? (
            <>
              <button className="btn-yes" onClick={() => onDelete(scarf.id)}>
                Yes
              </button>
              <button className="btn-no" onClick={() => setConfirming(false)}>
                No
              </button>
            </>
          ) : (
            <>
              <button
                className="btn-delete"
                onClick={() => setConfirming(true)}
              >
                ✕
              </button>
              <button className="btn-edit" onClick={() => onEdit(scarf)}>
                ✎
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
