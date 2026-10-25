import * as React from 'react';
import PropTypes from 'prop-types';
import { useState, useRef, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './Badge';
import { Button } from './Button';
import { Input } from './Input';
import { Popover, PopoverAnchor, PopoverContent } from './Popover';

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
      id,
      'aria-label': ariaLabel,
      ...props
    },
    ref,
  ) => {
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const inputRef = useRef(null);
    const suggestionListId = `tag-suggestions-${React.useId().replaceAll(':', '')}`;

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

    // Reset highlighted index when suggestions change
    useEffect(() => {
      if (highlightedIndex >= filteredSuggestions.length) {
        setHighlightedIndex(-1);
      }
    }, [filteredSuggestions, highlightedIndex]);

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverAnchor asChild>
          <div className={cn('relative w-full', className)} {...props}>
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(index);
                    }}
                    disabled={disabled}
                    className="ml-1 h-[44px] w-[44px] rounded-full text-secondary-foreground hover:bg-secondary-foreground/20 sm:h-8 sm:w-8"
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="size-3.5" />
                  </Button>
                </Badge>
              ))}

              {/* Input field */}
              {canAddMore && (
                <Input
                  ref={inputRef}
                  id={id}
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => filteredSuggestions.length > 0 && setIsOpen(true)}
                  placeholder={value.length === 0 ? placeholder : ''}
                  disabled={disabled}
                  className="h-8 min-w-[120px] flex-1 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  aria-label={ariaLabel || placeholder}
                  role="combobox"
                  aria-haspopup="listbox"
                  aria-autocomplete="list"
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? suggestionListId : undefined}
                  aria-activedescendant={
                    highlightedIndex >= 0
                      ? `${suggestionListId}-option-${highlightedIndex}`
                      : undefined
                  }
                />
              )}
            </div>

            {/* Tag counter */}
            <div className="mt-1.5 flex justify-end">
              <Badge
                variant={value.length >= maxTags ? 'warning' : 'secondary'}
                className="px-1.5 py-0 text-[10px] tabular-nums"
                aria-live="polite"
                aria-atomic="true"
              >
                {value.length}/{maxTags} tags
              </Badge>
            </div>

            {/* Autocomplete dropdown */}
            {isOpen && filteredSuggestions.length > 0 && (
              <PopoverContent
                id={suggestionListId}
                role="listbox"
                align="start"
                sideOffset={4}
                onOpenAutoFocus={(event) => event.preventDefault()}
                onCloseAutoFocus={(event) => event.preventDefault()}
                className="max-h-60 w-[var(--radix-popover-anchor-width)] overflow-y-auto p-1"
              >
                {filteredSuggestions.map((suggestion, index) => (
                  <Button
                    key={suggestion}
                    id={`${suggestionListId}-option-${index}`}
                    type="button"
                    variant="ghost"
                    size="sm"
                    role="option"
                    aria-selected={index === highlightedIndex}
                    onClick={() => handleSuggestionClick(suggestion)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      'flex h-[44px] min-h-11 w-full min-w-0 cursor-pointer items-center justify-start rounded-sm px-3 py-2 text-left text-sm text-popover-foreground sm:h-9',
                      'hover:bg-accent hover:text-accent-foreground',
                      index === highlightedIndex && 'bg-accent text-accent-foreground',
                    )}
                  >
                    {/* Highlight matching text */}
                    <HighlightMatch text={suggestion} query={inputValue} />
                  </Button>
                ))}
              </PopoverContent>
            )}
          </div>
        </PopoverAnchor>
      </Popover>
    );
  },
);

TagInput.displayName = 'TagInput';

TagInput.propTypes = {
  value: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func.isRequired,
  suggestions: PropTypes.arrayOf(PropTypes.string),
  placeholder: PropTypes.string,
  maxTags: PropTypes.number,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  id: PropTypes.string,
  'aria-label': PropTypes.string,
};

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
