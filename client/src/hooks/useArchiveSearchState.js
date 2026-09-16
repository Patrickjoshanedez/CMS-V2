import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

export const SCROLL_STORAGE_PREFIX = 'buksu_archive_scroll_';
export const MAX_SAVED_SCROLL_ENTRIES = 20;

/**
 * Bounded sessionStorage writer with LRU-style FIFO eviction to prevent storage leaks.
 */
export function saveScrollPositionWithEviction(key, scrollY) {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    const scrollKeys = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith(SCROLL_STORAGE_PREFIX)) {
        scrollKeys.push(k);
      }
    }
    // Evict oldest stored key if exceeding capacity threshold
    if (scrollKeys.length >= MAX_SAVED_SCROLL_ENTRIES && !scrollKeys.includes(key)) {
      window.sessionStorage.removeItem(scrollKeys[0]);
    }
    window.sessionStorage.setItem(key, String(scrollY));
  } catch {
    // Ignore storage quotas or private browsing restrictions
  }
}

/**
 * useArchiveSearchState — Institutional URL-synced search and facet state hook.
 *
 * Implements strict URL parameter specifications:
 * - Canonical params: `q`, `year_min`, `year_max`, `program`, `sort`, `scope`, `p`
 * - Defensive aliases: reads `minY`/`minYear` into `year_min`, `maxY`/`maxYear` into `year_max`
 * - Push vs Replace: Text typing debounces and replaces history to avoid pollution;
 *   explicit filter selections and searches push history.
 * - Scroll restoration: Persists scroll offset in sessionStorage keyed by URL search string.
 */
export function useArchiveSearchState(initialLimit = 10) {
  const [urlParams, setSearchParams] = useSearchParams();

  // Read initial values from URL (with defensive fallback aliasing)
  const initialQuery = urlParams.get('q') || '';
  const initialScope = urlParams.get('scope') || 'all';
  const initialYearMin =
    urlParams.get('year_min') || urlParams.get('minY') || urlParams.get('minYear') || '';
  const initialYearMax =
    urlParams.get('year_max') || urlParams.get('maxY') || urlParams.get('maxYear') || '';
  const initialProgram = urlParams.get('program') || 'all';
  const initialSort = urlParams.get('sort') || 'relevance';
  const initialPage = Number(urlParams.get('p') || urlParams.get('page') || 1);
  const initialDateFilter = urlParams.get('df') || (initialYearMin ? 'custom' : 'any');

  // Local state
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [scope, setScope] = useState(initialScope);
  const [dateFilter, setDateFilter] = useState(initialDateFilter);
  const [yearMin, setYearMin] = useState(initialYearMin);
  const [yearMax, setYearMax] = useState(initialYearMax);
  const [program, setProgram] = useState(initialProgram);
  const [sortBy, setSortBy] = useState(initialSort);
  const [includeCitations, setIncludeCitations] = useState(
    () => urlParams.get('cites') !== 'false',
  );
  const [includeFilings, setIncludeFilings] = useState(() => urlParams.get('filings') !== 'false');
  const [page, setPage] = useState(initialPage);

  const isFirstRender = useRef(true);
  const lastPushedQueryRef = useRef(initialQuery);

  // Debounce query changes (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      if (!isFirstRender.current && query !== lastPushedQueryRef.current) {
        setPage(1);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Synchronize state back to URL parameters
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const next = new URLSearchParams();
    if (debouncedQuery.trim()) next.set('q', debouncedQuery.trim());
    if (scope && scope !== 'all') next.set('scope', scope);
    if (dateFilter && dateFilter !== 'any') next.set('df', dateFilter);
    if (yearMin) next.set('year_min', String(yearMin));
    if (yearMax) next.set('year_max', String(yearMax));
    if (program && program !== 'all') next.set('program', program);
    if (sortBy && sortBy !== 'relevance') next.set('sort', sortBy);
    if (!includeCitations) next.set('cites', 'false');
    if (!includeFilings) next.set('filings', 'false');
    if (page > 1) next.set('p', String(page));

    const isTypingQuery = query !== lastPushedQueryRef.current;
    // Replace URL while typing to avoid polluting history stack; push for explicit filter changes
    setSearchParams(next, { replace: isTypingQuery });
    lastPushedQueryRef.current = debouncedQuery;
  }, [
    debouncedQuery,
    scope,
    dateFilter,
    yearMin,
    yearMax,
    program,
    sortBy,
    includeCitations,
    includeFilings,
    page,
    setSearchParams,
  ]);

  // Scroll Position Restoration via sessionStorage
  useEffect(() => {
    const searchKey = SCROLL_STORAGE_PREFIX + (window.location.search || 'default');
    const savedOffset = window.sessionStorage?.getItem(searchKey);

    if (savedOffset) {
      const targetY = Number(savedOffset);
      if (!isNaN(targetY)) {
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: targetY, behavior: 'instant' });
        });
      }
    }

    const handleBeforeUnloadOrNav = () => {
      saveScrollPositionWithEviction(searchKey, window.scrollY);
    };

    window.addEventListener('beforeunload', handleBeforeUnloadOrNav);
    return () => {
      handleBeforeUnloadOrNav();
      window.removeEventListener('beforeunload', handleBeforeUnloadOrNav);
    };
  }, [urlParams]);

  /**
   * Clears search query, removes `q` parameter, resets page to 1,
   * while preserving existing facet filters (years, program, sort, scope).
   */
  const clearQuery = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setPage(1);
    lastPushedQueryRef.current = '';

    const next = new URLSearchParams(urlParams);
    next.delete('q');
    next.delete('p');
    setSearchParams(next, { replace: false });
  }, [urlParams, setSearchParams]);

  /**
   * Resets all search filters and facets to institutional defaults.
   */
  const resetFilters = useCallback(() => {
    setDateFilter('any');
    setYearMin('');
    setYearMax('');
    setProgram('all');
    setSortBy('relevance');
    setIncludeCitations(true);
    setIncludeFilings(true);
    setScope('all');
    setPage(1);

    const next = new URLSearchParams();
    if (query.trim()) next.set('q', query.trim());
    setSearchParams(next, { replace: false });
  }, [query, setSearchParams]);

  /**
   * Prepares query payload for backend useArchiveSearch query hook.
   */
  const searchParamsPayload = useMemo(() => {
    let effectiveMinYear = yearMin;
    let effectiveMaxYear = yearMax;

    if (dateFilter && dateFilter !== 'any' && dateFilter !== 'custom') {
      effectiveMinYear = dateFilter; // e.g. '2026', '2025'
      effectiveMaxYear = '';
    }

    return {
      ...(debouncedQuery.trim() && { search: debouncedQuery.trim(), q: debouncedQuery.trim() }),
      scope,
      ...(effectiveMinYear && { minYear: String(effectiveMinYear) }),
      ...(effectiveMaxYear && { maxYear: String(effectiveMaxYear) }),
      ...(program && program !== 'all' && { program }),
      sortBy,
      includeCitations,
      includeFilings,
      page,
      limit: initialLimit,
    };
  }, [
    debouncedQuery,
    scope,
    dateFilter,
    yearMin,
    yearMax,
    program,
    sortBy,
    includeCitations,
    includeFilings,
    page,
    initialLimit,
  ]);

  return {
    query,
    setQuery,
    debouncedQuery,
    scope,
    setScope,
    dateFilter,
    setDateFilter,
    yearMin,
    setYearMin,
    yearMax,
    setYearMax,
    program,
    setProgram,
    sortBy,
    setSortBy,
    includeCitations,
    setIncludeCitations,
    includeFilings,
    setIncludeFilings,
    page,
    setPage,
    clearQuery,
    resetFilters,
    searchParamsPayload,
  };
}

export default useArchiveSearchState;
