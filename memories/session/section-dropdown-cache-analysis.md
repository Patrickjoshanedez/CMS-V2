# Sections Dropdown Cache & Stale Data Analysis

## Overview
Analysis of how sections are fetched, displayed, and cached in CreateProjectPage vs. UsersPage, and why newly created sections might not appear immediately.

---

## 1. CURRENT STALETIME SETTING FOR SECTIONS QUERY

### Primary Query Hook: `useSections()`
**Location:** [client/src/hooks/useAcademics.js](client/src/hooks/useAcademics.js#L46-L55)

```javascript
export function useSections(filters = {}, options = {}) {
  return useQuery({
    queryKey: academicKeys.sections(filters),
    queryFn: async () => {
      const { data } = await academicService.listSections(filters);
      return data.data.sections;
    },
    staleTime: 30 * 1000,  // 30 SECONDS
    ...options,
  });
}
```

**Key Issue:** 30-second staleTime means newly created sections won't appear until:
- 30 seconds pass, OR
- Cache is manually invalidated, OR
- Page refocus/reconnect triggers refetch

---

## 2. HOW SECTIONS ARE FETCHED & DISPLAYED

### CreateProjectPage Implementation
**Location:** [client/src/pages/projects/CreateProjectPage.jsx](client/src/pages/projects/CreateProjectPage.jsx#L77-L98)

```javascript
const {
  data: sections = [],
  isLoading: isSectionsLoading,
  isError: isSectionsError,
  refetch: refetchSections,
} = useSections(
  { academicYear: form.academicYear || undefined },
  { enabled: Boolean(form.academicYear) },
);

// Sections pre-filtered by academicYear via query params
const sectionOptions = sections;

// Refetch when academic year changes (GOOD!)
useEffect(() => {
  if (form.academicYear) {
    refetchSections();
  }
}, [form.academicYear, refetchSections]);
```

**Dropdown Rendering:** [lines 446-464](client/src/pages/projects/CreateProjectPage.jsx#L446-L464)
- Single select showing course code + section name
- Filters by academic year before query
- Has loading/error states
- Has "Retry" button for error recovery

### UsersPage Implementation (For Comparison)
**Location:** [client/src/pages/users/UsersPage.jsx](client/src/pages/users/UsersPage.jsx#L97-L103)

```javascript
const { data: sections = [] } = useSections(
  {
    courseId: selectedCourseId || undefined,
    academicYear: selectedAcademicYear || undefined,
  },
  { enabled: Boolean(selectedCourseId || selectedAcademicYear) },
);
```

- Filters by BOTH courseId AND academicYear
- Enables only when at least one filter is set
- No automatic refetch on academic year change

---

## 3. SECTION CREATION FLOW

### Backend Service
**Location:** [server/modules/academics/academic.service.js](server/modules/academics/academic.service.js#L31-L49)

```javascript
async createSection(instructorId, data) {
  // Validates course exists
  // Creates section in MongoDB
  // Returns populated section with courseId details
  const populatedSection = await Section.findById(section._id)
    .populate('courseId', 'name code');
  return { section: populatedSection };
}

async listSections(query) {
  const filter = { isActive: true };
  if (query.courseId) filter.courseId = query.courseId;
  if (query.academicYear) filter.academicYear = query.academicYear;

  const sections = await Section.find(filter)
    .sort({ academicYear: -1, name: 1 })
    .populate('courseId', 'name code')
    .lean();

  return { sections };
}
```

### Frontend Mutation Hook
**Location:** [client/src/hooks/useAcademics.js](client/src/hooks/useAcademics.js#L11-L26)

```javascript
function useAcademicMutation(mutationFn, options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options;

  return useMutation({
    mutationFn,
    onSuccess: (...args) => {
      // INVALIDATES ALL ACADEMICS QUERIES!
      queryClient.invalidateQueries({ queryKey: academicKeys.all });
      onSuccess?.(...args);
    },
    onError,
    ...restOptions,
  });
}

export function useCreateSection(options = {}) {
  return useAcademicMutation(async (payload) => {
    const res = await academicService.createSection(payload);
    return res.data;
  }, options);
}
```

---

## 4. CACHE INVALIDATION STRATEGY

### What Happens After Section Creation

✅ **GOOD:** After `useCreateSection()` succeeds:
- `queryClient.invalidateQueries({ queryKey: academicKeys.all })` is called
- This invalidates ALL academic queries including:
  - `academicKeys.courses()`
  - `academicKeys.sections(filters)` — **for ALL filter combinations**
  - `academicKeys.years()`
  - `academicKeys.hierarchy(filters)` — **for ALL filter combinations**

### Cache Key Structure
**Location:** [client/src/hooks/useAcademics.js](client/src/hooks/useAcademics.js#L1-L9)

```javascript
export const academicKeys = {
  all: ['academics'],
  courses: () => [...academicKeys.all, 'courses'],
  sections: (filters) => [...academicKeys.all, 'sections', filters],
  years: () => [...academicKeys.all, 'academic-years'],
  hierarchy: (filters) => [...academicKeys.all, 'hierarchy', filters],
};
```

**Impact:** Invalidating `academicKeys.all` invalidates all child keys, triggering refetch for:
- CreateProjectPage's `useSections({ academicYear: '2025-2026' })` query
- UsersPage's `useSections({ courseId: '...', academicYear: '...' })` query
- Any other section queries

---

## 5. POTENTIAL ISSUES & EDGE CASES

### ❌ Issue 1: Stale Cache Before Invalidation

**Scenario:** User creates section, but invalidation hasn't executed yet while checking dropdown
- **Cause:** The 30-second staleTime means data is considered "fresh" until then
- **Timeline:**
  1. User views CreateProjectPage (loads sections, starts 30s timer)
  2. User navigates to create section (happens another page/modal)
  3. Section created, invalidation fires
  4. But if done quickly, React Query might not re-render

### ❌ Issue 2: No Automatic Refetch in Some Contexts

**CreateProjectPage:** ✅ Has explicit refetch on academicYear change
```javascript
useEffect(() => {
  if (form.academicYear) {
    refetchSections();
  }
}, [form.academicYear, refetchSections]);
```

**UsersPage:** ❌ No explicit refetch after section creation
- Only relies on cache invalidation
- Doesn't refetch when filters change (only when enabled state changes)

### ❌ Issue 3: Filter-Based Cache Keys

When `useSections()` is called with different filters, it creates different cache entries:
```javascript
queryKey: academicKeys.sections(filters)
// Results in cache keys like:
// ['academics', 'sections', { academicYear: '2025-2026' }]
// ['academics', 'sections', { courseId: '...', academicYear: '2025-2026' }]
```

**If a section is created but filters don't match:**
- Example: User viewing sections for COURSE A
- Section created for COURSE B with same academicYear
- The create invalidates all sections queries
- But when user switches back to COURSE A, they still need refetch

---

## 6. SPECIAL CASE: ProfilePage

**Location:** [client/src/pages/profile/ProfilePage.jsx](client/src/pages/profile/ProfilePage.jsx#L83-L98)

ProfilePage uses most aggressive caching strategy:
```javascript
const {
  data: sections = [],
  ...
} = useSections(
  {},  // NO FILTERS
  {
    enabled: isStudent,
    staleTime: 0,           // ← ZERO! Always stale
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: true,
    retry: shouldRetryAcademicLookup,
  },
);
```

**Why?** Students need to see newly created sections for registration. For instructor paths creating sections, this freshness is less critical.

---

## SUMMARY OF FINDINGS

| Aspect | Current Behavior | Issue |
|--------|------------------|-------|
| **Sections StaleTime** | 30 seconds | May delay newly created sections appearing |
| **Cache Invalidation** | Invalidates all academics queries on creation | ✅ Comprehensive, but relies on old data stale timeout |
| **CreateProjectPage Refetch** | Explicit refetch on academicYear change | ✅ Good, ensures fresh data |
| **UsersPage Refetch** | No explicit refetch after creation | ❌ Relies only on invalidation + stale timeout |
| **Filter-based Caching** | Different filters = different cache entries | ⚠️ All invalidated at once (broad but effective) |
| **ProfilePage Strategy** | staleTime: 0, always refetch | ✅ Most aggressive for student registration |
| **Hierarchy Query** | staleTime: 60 seconds | ⚠️ Longer than sections, may lag |

---

## RECOMMENDATIONS FOR FIXING

### Option 1: Lower Stale Time for Sections
```javascript
export function useSections(filters = {}, options = {}) {
  return useQuery({
    queryKey: academicKeys.sections(filters),
    queryFn: async () => {
      const { data } = await academicService.listSections(filters);
      return data.data.sections;
    },
    staleTime: 10 * 1000,  // Reduced from 30s to 10s
    ...options,
  });
}
```

### Option 2: Add Explicit Refetch Hook
Create a custom hook that pages call after section creation:
```javascript
export function useRefreshSections() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ 
      queryKey: academicKeys.sections({})  // Specific refetch
    });
  };
}
```

### Option 3: Immediate Manual Refetch After Creation
In pages where section is created, add success callback:
```javascript
const createSection = useCreateSection({
  onSuccess: () => {
    refetchSections();  // Immediate refetch
    toast.success('Section created!');
  }
});
```

### Option 4: Match ProfilePage Strategy for Critical Flows
For CreateProjectPage (student-facing):
```javascript
useSections(
  { academicYear: form.academicYear || undefined },
  { 
    enabled: Boolean(form.academicYear),
    staleTime: 10 * 1000,           // Shorter
    refetchOnWindowFocus: true,      // Refetch on tab switch
  },
);
```

---

## Files Involved

- **Hook Definition:** [client/src/hooks/useAcademics.js](client/src/hooks/useAcademics.js)
- **CreateProjectPage:** [client/src/pages/projects/CreateProjectPage.jsx](client/src/pages/projects/CreateProjectPage.jsx)
- **UsersPage:** [client/src/pages/users/UsersPage.jsx](client/src/pages/users/UsersPage.jsx)
- **Backend Service:** [server/modules/academics/academic.service.js](server/modules/academics/academic.service.js)
- **Backend Controller:** [server/modules/academics/academic.controller.js](server/modules/academics/academic.controller.js)
