import { useState, useEffect } from "react";

/**
 * Full-screen photo lightbox.
 * Supports keyboard navigation (← → Esc) and multiple photos.
 */
export default function Lightbox({ photos, start, onClose }) {
  const [idx, setIdx] = useState(start);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % photos.length);
      if (e.key === "ArrowLeft") setIdx((i) => (i - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [photos.length, onClose]);

  return (
    <div className="lb-overlay" onClick={onClose}>
      <div className="lb-box" onClick={(e) => e.stopPropagation()}>
        <button className="lb-close" onClick={onClose}>✕</button>
        <img src={photos[idx]} className="lb-img" alt="scarf" />
        {photos.length > 1 && (
          <div className="lb-nav">
            <button onClick={() => setIdx((i) => (i - 1 + photos.length) % photos.length)}>‹</button>
            <span>{idx + 1} / {photos.length}</span>
            <button onClick={() => setIdx((i) => (i + 1) % photos.length)}>›</button>
          </div>
        )}
      </div>
    </div>
  );
}
