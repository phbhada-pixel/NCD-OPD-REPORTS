import React from 'react';

interface HighlightTextProps {
  text: string;
  query: string;
  className?: string;
  highlightClassName?: string;
}

/**
 * Renders text with matching substrings highlighted based on search query.
 * Supports multi-word queries, case-insensitivity, and Devanagari script.
 */
export const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  query,
  className = '',
  highlightClassName = 'bg-amber-200 text-amber-950 font-black px-0.5 rounded-xs shadow-2xs',
}) => {
  if (!text) return null;
  const trimmed = (query || '').trim();
  if (!trimmed) {
    return <span className={className}>{text}</span>;
  }

  // Split into unique non-empty words to support multi-word matching
  const words = Array.from(
    new Set(
      trimmed
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0)
    )
  );

  if (words.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Escape special regex characters for each word
  const pattern = words
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  try {
    const regex = new RegExp(`(${pattern})`, 'gi');
    const parts = text.split(regex);

    return (
      <span className={className}>
        {parts.map((part, index) => {
          const isMatch = words.some(
            (w) => w.toLowerCase() === part.toLowerCase()
          );
          return isMatch ? (
            <mark key={index} className={highlightClassName}>
              {part}
            </mark>
          ) : (
            <React.Fragment key={index}>{part}</React.Fragment>
          );
        })}
      </span>
    );
  } catch {
    return <span className={className}>{text}</span>;
  }
};
