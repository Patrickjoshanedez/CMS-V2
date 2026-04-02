import * as React from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './Badge';

/**
 * TagInput — A reusable tag input component with autocomplete.
 * Follows shadcn/ui patterns with full keyboard support.
 *
 * @param {string[]} value - Controlled array of selected tags
 * @param {(tags: string[]) => void} onChange - Callback when tags change
 * @param {string[]} suggestions - Optional array of autocomplete suggestions
 * @param {string} placeholder - Input placeholder text
 * @param {number} maxTags - Maximum allowed tags (default: 10)
 * @param {boolean} disabled - Disable the input
 * @param {string} className - Additional CSS classes
 */
const TagInput = React.forwardRef(
  (
    {
      value = [],
      onChange,
      suggestions = [],
      placeholder = 'Type to add...',
      maxTags = 10,
      disabled = false,
      className,
      ...props
    },
    ref,
  ) => {
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // Combine refs if external ref is provided
    React.useImperativeHandle(ref, () => inputRef.current);

    // Filter suggestions based on input (case-insensitive)
    const filteredSuggestions = React.useMemo(() => {
      if (!inputValue.trim()) return [];
      const searchTerm = inputValue.toLowerCase().trim();
      return suggestions.filter(
        (suggestion) =>
          suggestion.toLowerCase().includes(searchTerm) && !value.includes(suggestion),
      );
    }, [inputValue, suggestions, value]);

    // Check if we can add more tags
    const canAddMore = value.length < maxTags;

    // Add a tag
    const addTag = useCallback(
      (tag) => {
        const trimmedTag = tag.trim();
        if (!trimmedTag) return false;
        if (!canAddMore) return false;
        if (value.includes(trimmedTag)) return false;

        onChange([...value, trimmedTag]);
        setInputValue('');
        setHighlightedIndex(-1);
        return true;
      },
      [value, onChange, canAddMore],
    );

    // Remove a tag by index
    const removeTag = useCallback(
      (indexToRemove) => {
        if (disabled) return;
        onChange(value.filter((_, index) => index !== indexToRemove));
      },
      [value, onChange, disabled],
    );

    // Handle keyboard events
    const handleKeyDown = useCallback(
      (e) => {
        if (disabled) return;

        // Handle comma key - add tag
        if (e.key === ',') {
          e.preventDefault();
          if (inputValue.trim()) {
            addTag(inputValue);
          }
          return;
        }

        // Handle Enter key
        if (e.key === 'Enter') {
          e.preventDefault();
          // If a suggestion is highlighted, add it
          if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
            addTag(filteredSuggestions[highlightedIndex]);
          } else if (inputValue.trim()) {
            // Otherwise add the typed value
            addTag(inputValue);
          }
          return;
        }

        // Handle Backspace - remove last tag if input is empty
        if (e.key === 'Backspace' && !inputValue && value.length > 0) {
          removeTag(value.length - 1);
          return;
        }

        // Handle arrow keys for suggestion navigation
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (filteredSuggestions.length > 0) {
            setIsOpen(true);
            setHighlightedIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
          }
          return;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (filteredSuggestions.length > 0) {
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
          }
          return;
        }

        // Handle Escape - close suggestions
        if (e.key === 'Escape') {
          setIsOpen(false);
          setHighlightedIndex(-1);
          return;
        }
      },
      [disabled, inputValue, value, highlightedIndex, filteredSuggestions, addTag, removeTag],
    );

    // Handle input change
    const handleInputChange = (e) => {
      const newValue = e.target.value;
      // Don't allow comma in the input value
      if (newValue.includes(',')) {
        const parts = newValue.split(',');
        if (parts[0].trim()) {
          addTag(parts[0]);
        }
        setInputValue(parts.slice(1).join(''));
      } else {
        setInputValue(newValue);
      }
      setHighlightedIndex(-1);
    };

    // Handle suggestion click
    const handleSuggestionClick = (suggestion) => {
      addTag(suggestion);
      inputRef.current?.focus();
    };

    // Show suggestions when typing
    useEffect(() => {
      setIsOpen(filteredSuggestions.length > 0 && inputValue.trim() !== '');
    }, [filteredSuggestions, inputValue]);

    // Close suggestions on outside click
    useEffect(() => {
      const handleClickOutside = (e) => {
        if (containerRef.current && !containerRef.current.contains(e.target)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset highlighted index when suggestions change
    useEffect(() => {
      if (highlightedIndex >= filteredSuggestions.length) {
        setHighlightedIndex(-1);
      }
    }, [filteredSuggestions, highlightedIndex]);

    return (
      <div ref={containerRef} className={cn('relative w-full', className)} {...props}>
        {/* Main container styled like an input */}
        <div
          className={cn(
            'flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
            'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
            disabled && 'cursor-not-allowed opacity-50',
          )}
          onClick={() => !disabled && inputRef.current?.focus()}
        >
          {/* Rendered tags */}
          {value.map((tag, index) => (
            <Badge
              key={`${tag}-${index}`}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <span className="max-w-[150px] truncate">{tag}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
                disabled={disabled}
                className={cn(
                  'ml-1 rounded-full p-0.5 hover:bg-secondary-foreground/20 focus:outline-none focus:ring-1 focus:ring-ring',
                  disabled && 'pointer-events-none',
                )}
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {/* Input field */}
          {canAddMore && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => filteredSuggestions.length > 0 && setIsOpen(true)}
              placeholder={value.length === 0 ? placeholder : ''}
              disabled={disabled}
              className={cn(
                'flex-1 min-w-[120px] bg-transparent outline-none placeholder:text-muted-foreground',
                disabled && 'cursor-not-allowed',
              )}
              aria-autocomplete="list"
              aria-expanded={isOpen}
              aria-controls="tag-suggestions"
            />
          )}
        </div>

        {/* Tag counter */}
        <div className="mt-1.5 flex justify-end">
          <span
            className={cn(
              'text-xs text-muted-foreground',
              value.length >= maxTags && 'text-amber-500 dark:text-amber-400',
            )}
          >
            {value.length}/{maxTags} tags
          </span>
        </div>

        {/* Autocomplete dropdown */}
        {isOpen && filteredSuggestions.length > 0 && (
          <div
            id="tag-suggestions"
            role="listbox"
            className={cn(
              'absolute left-0 right-0 top-full z-50 mt-1',
              'max-h-60 overflow-auto rounded-md border border-input bg-popover shadow-md',
            )}
          >
            {filteredSuggestions.map((suggestion, index) => (
              <div
                key={suggestion}
                role="option"
                aria-selected={index === highlightedIndex}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  'cursor-pointer px-3 py-2 text-sm text-popover-foreground',
                  'hover:bg-accent hover:text-accent-foreground',
                  index === highlightedIndex && 'bg-accent text-accent-foreground',
                )}
              >
                {/* Highlight matching text */}
                <HighlightMatch text={suggestion} query={inputValue} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);

TagInput.displayName = 'TagInput';

/**
 * Helper component to highlight matching text in suggestions
 */
function HighlightMatch({ text, query }) {
  if (!query.trim()) return <span>{text}</span>;

  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="font-semibold text-primary">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

/**
 * Escape special regex characters
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export { TagInput };
