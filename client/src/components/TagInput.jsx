import { useState, useRef } from "react";
import { TAG_SUGGESTIONS } from "../constants";

/**
 * Tag chip input with autocomplete.
 * - Enter or comma confirms a tag
 * - Backspace on empty input removes the last tag
 * - Suggestions pull from TAG_SUGGESTIONS + existing tags across the collection
 */
export default function TagInput({ tags, onChange, allTags }) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  const suggestions = [...new Set([...TAG_SUGGESTIONS, ...allTags])]
    .filter(
      (s) =>
        s.toLowerCase().includes(input.toLowerCase()) &&
        !tags.includes(s) &&
        input.length > 0
    )
    .slice(0, 6);

  const addTag = (tag) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (tag) => onChange(tags.filter((t) => t !== tag));

  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="tag-input-wrap" onClick={() => inputRef.current?.focus()}>
      <div className="tag-input-inner">
        {tags.map((tag) => (
          <span key={tag} className="tag-pill">
            {tag}
            <button
              className="tag-pill-remove"
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
            >
              ✕
            </button>
          </span>
        ))}
        <div className="tag-input-field-wrap">
          <input
            ref={inputRef}
            className="tag-input-field"
            placeholder={tags.length === 0 ? "Type a tag, press Enter or comma…" : ""}
            value={input}
            onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="tag-suggestions">
              {suggestions.map((s) => (
                <div key={s} className="tag-suggestion" onMouseDown={() => addTag(s)}>
                  + {s}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
