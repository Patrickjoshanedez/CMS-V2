import React, { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Archive,
  Star,
  Quote,
  Layers,
  FileText,
  ExternalLink,
  SlidersHorizontal,
  BookOpen,
  Upload,
  Code2,
  Image as ImageIcon,
} from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { ROLES } from '@cms/shared';

import { useArchiveSearch } from '@/hooks/useProjects';
import { useArchiveSearchState } from '@/hooks/useArchiveSearchState';
import { useCourses } from '@/hooks/useAcademics';
import GoogleScholarSearchBar from '@/components/archive/GoogleScholarSearchBar';
import GoogleScholarSidebar from '@/components/archive/GoogleScholarSidebar';
import OriginalityShieldBadge from '@/components/archive/OriginalityShieldBadge';
import CitationExportModal from '@/components/archive/CitationExportModal';
import SimilarProjectModal from '@/components/projects/SimilarProjectModal';
import PrototypeGalleryModal from '@/components/projects/PrototypeGalleryModal';

const CURRENT_YEAR = new Date().getFullYear();
const SAVED_PROJECTS_STORAGE_KEY = 'buksu_archive_saved_projects';

/**
 * Safely highlight matching query keywords in snippet text.
 */
function HighlightedSnippet({ text = '', query = '' }) {
  if (!text) return <span className="text-muted-foreground italic">No abstract available.</span>;
  if (!query || !query.trim()) {
    return <span>{text}</span>;
  }

  const terms = query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  if (terms.length === 0) {
    return <span>{text}</span>;
  }

  const regex = new RegExp(`(${terms.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <strong key={i} className="font-bold text-foreground">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

export default function ArchiveSearchPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Synced URL search state hook
  const {
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
  } = useArchiveSearchState(10);

  // UI modal state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [citationModalProject, setCitationModalProject] = useState(null);
  const [similarModalProject, setSimilarModalProject] = useState(null);
  const [prototypeModalProject, setPrototypeModalProject] = useState(null);

  // Saved / Bookmarked projects in localStorage
  const [savedProjectIds, setSavedProjectIds] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem(SAVED_PROJECTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Dynamic courses catalog from Student Management Hierarchy
  const { data: courses = [] } = useCourses();
  const { user } = useAuthStore();
  const isInstructor = user?.role === ROLES.INSTRUCTOR;

  const { data, isLoading, error } = useArchiveSearch(searchParamsPayload);

  const projects = data?.projects ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: 10, total: 0, pages: 1 };
  const searchLatency = data?.searchLatencyMs ?? 42;

  const rangeStart = Math.max(1, (pagination.page - 1) * pagination.limit + 1);
  const rangeEnd = Math.min(pagination.page * pagination.limit, pagination.total);

  // Toggle Save to Library
  const handleToggleSave = useCallback((projectId) => {
    setSavedProjectIds((prev) => {
      const exists = prev.includes(projectId);
      const next = exists ? prev.filter((id) => id !== projectId) : [...prev, projectId];
      try {
        window.localStorage.setItem(SAVED_PROJECTS_STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        console.error('Failed to save to localStorage:', err);
      }
      if (exists) {
        toast.info('Removed manuscript from your library');
      } else {
        toast.success('Saved manuscript to your academic library');
      }
      return next;
    });
  }, []);

  // Filter change handlers
  const handleDateFilterChange = (id) => {
    setDateFilter(id);
    setPage(1);
  };

  const handleApplyCustomRange = (min, max) => {
    setDateFilter('custom');
    setYearMin(min);
    setYearMax(max);
    setPage(1);
    setIsMobileSidebarOpen(false);
  };

  // Navigate to Dedicated Full-Page Document Reader Route
  const handleOpenDocument = (projectId) => {
    navigate(`/archive/document/${projectId}`, {
      state: { from: location.pathname + location.search },
    });
  };

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Top Minimalist Academic Header & Centered Search Bar */}
        <div className="pt-2 pb-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="space-y-1 text-left">
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                <BookOpen className="w-6 h-6 text-primary shrink-0" />
                BukSU Research Archive
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
                Search approved capstone titles and archived manuscripts.
              </p>
            </div>

            {isInstructor && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={() =>
                    navigate('/archive/upload/capstone', { state: { fromArchive: true } })
                  }
                  className="gap-2 shadow-xs"
                >
                  <Upload className="w-4 h-4" />
                  Archive Documents (OCR)
                </Button>
              </div>
            )}
          </div>

          <GoogleScholarSearchBar
            query={query}
            onQueryChange={setQuery}
            scope={scope}
            onScopeChange={setScope}
            onSearch={() => setPage(1)}
            onClear={clearQuery}
            totalResults={pagination.total}
          />
        </div>

        {/* Main Content Layout with Fixed Desktop Sidebar & Mobile Drawer */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Streamlined Left-Hand Multi-Facet Sidebar */}
          <GoogleScholarSidebar
            dateFilter={dateFilter}
            onDateFilterChange={handleDateFilterChange}
            customMinYear={yearMin}
            customMaxYear={yearMax}
            onApplyCustomRange={handleApplyCustomRange}
            program={program}
            onProgramChange={(prog) => {
              setProgram(prog);
              setPage(1);
            }}
            courses={courses}
            sortBy={sortBy}
            onSortByChange={(sort) => {
              setSortBy(sort);
              setPage(1);
            }}
            includeCitations={includeCitations}
            onToggleCitations={() => setIncludeCitations((prev) => !prev)}
            includeFilings={includeFilings}
            onToggleFilings={() => setIncludeFilings((prev) => !prev)}
            onResetFilters={resetFilters}
            isOpenMobile={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />

          {/* Central Dedicated Feed */}
          <main className="flex-1 min-w-0 w-full">
            {/* Results Metadata Bar & Mobile Filter Trigger */}
            <div className="flex items-center justify-between pb-3 border-b border-border text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="md:hidden h-8 px-2.5 text-xs flex items-center gap-1.5"
                  aria-label="Open filter sidebar"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filters
                </Button>
                <span>
                  About {pagination.total.toLocaleString()} results (
                  {(searchLatency / 1000).toFixed(2)} seconds)
                </span>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>
                  {error?.message ||
                    'Unable to retrieve archived projects. Please adjust your query and try again.'}
                </AlertDescription>
              </Alert>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="py-6">
                <PageSkeleton />
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && projects.length === 0 && (
              <div className="py-16 text-center space-y-3">
                <Archive className="w-12 h-12 text-muted-foreground/40 mx-auto" />
                <h3 className="text-base font-semibold text-foreground">
                  Your search did not match any archived capstone manuscripts.
                </h3>
                <div className="text-xs text-muted-foreground space-y-1 max-w-md mx-auto text-left pl-6 list-disc">
                  <p>Suggestions:</p>
                  <li>Make sure that all words are spelled correctly.</li>
                  <li>Try different keywords or broader academic terms.</li>
                  <li>Try more general keywords or adjust the publication date range.</li>
                  <li>
                    Check if the active scope filter ({scope}) or program filter ({program}) is
                    overly restrictive.
                  </li>
                </div>

                {isInstructor && (
                  <div className="pt-2 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate('/archive/upload/capstone', { state: { fromArchive: true } })
                      }
                      className="gap-2 text-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Archive New Capstone Documents (Paper & Journal)
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Results Feed: Uncluttered Google Scholar Snippets */}
            {!isLoading && projects.length > 0 && (
              <div className="mt-4 space-y-6 divide-y divide-border/60">
                {projects.map((project) => {
                  const isSaved = savedProjectIds.includes(project._id);
                  const proponents =
                    project.proponents ||
                    (Array.isArray(project.authors) ? project.authors.join(', ') : null) ||
                    project.teamId?.name ||
                    'BukSU Proponents';

                  const pubYear =
                    project.publicationYear ||
                    (project.academicYear ? project.academicYear.split('-')[1] : CURRENT_YEAR);

                  const publisher = project.publisher || 'BukSU Studies Center';
                  const doi =
                    project.doi ||
                    (project.archiveMetadata?.doi
                      ? `https://doi.org/${project.archiveMetadata.doi}`
                      : null);

                  return (
                    <article key={project._id} className="pt-5 first:pt-0">
                      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
                        {/* Left: Academic Title, Metadata, Abstract, Actions */}
                        <div className="w-full min-w-0 flex-1 space-y-2">
                          {/* Academic Hyperlinked Title */}
                          <h2 className="text-[17px] sm:text-[18px] font-medium leading-snug tracking-normal">
                            <button
                              type="button"
                              onClick={() => handleOpenDocument(project._id)}
                              className="text-left text-primary hover:underline focus:outline-hidden focus:ring-1 focus:ring-primary rounded-xs"
                              title={`Read manuscript: ${project.title}`}
                            >
                              {project.title}
                            </button>
                          </h2>

                          {/* Subdued Green Snippet Metadata Line */}
                          <div className="text-[13px] leading-relaxed text-muted-foreground flex flex-wrap items-center gap-1.5 font-normal">
                            <span className="max-w-full truncate sm:max-w-[400px]">
                              {proponents}
                            </span>
                            <span className="text-muted-foreground/60">•</span>
                            <span>{publisher}</span>
                            <span className="text-muted-foreground/60">•</span>
                            <span>{pubYear}</span>
                            {doi && (
                              <>
                                <span className="text-muted-foreground/60">•</span>
                                <a
                                  href={doi.startsWith('http') ? doi : `https://doi.org/${doi}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="max-w-full break-all hover:underline text-[12px] opacity-90 inline-flex items-center gap-0.5"
                                  title="Open Digital Object Identifier (DOI)"
                                >
                                  doi:{doi.replace(/^https?:\/\/doi\.org\//, '')}
                                  <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                                </a>
                              </>
                            )}
                          </div>

                          {/* Snippet Abstract (clamped to 3 lines with keyword highlighting) */}
                          <p className="text-sm leading-relaxed text-foreground/80 line-clamp-3 pt-1">
                            <HighlightedSnippet text={project.abstract} query={debouncedQuery} />
                          </p>

                          {/* Standardized 4-Action Snippet Toolbar */}
                          <div className="pt-1 flex items-center flex-wrap gap-x-4 gap-y-2 text-[13px] text-muted-foreground select-none [&>button]:min-h-11 sm:[&>button]:min-h-8">
                            {/* 1. Save to Library */}
                            <button
                              type="button"
                              onClick={() => handleToggleSave(project._id)}
                              className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
                                isSaved ? 'text-amber-500 dark:text-amber-400 font-medium' : ''
                              }`}
                              aria-label={isSaved ? 'Remove from library' : 'Save to library'}
                            >
                              <Star className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                              <span>{isSaved ? 'Saved' : 'Save'}</span>
                            </button>

                            {/* 2. Cite Modal Trigger */}
                            <button
                              type="button"
                              onClick={() => setCitationModalProject(project)}
                              className="inline-flex items-center gap-1 hover:text-foreground hover:underline transition-colors"
                            >
                              <Quote className="w-3.5 h-3.5" />
                              <span>Cite</span>
                            </button>

                            {/* 3. Related Articles */}
                            <button
                              type="button"
                              onClick={() => setSimilarModalProject(project)}
                              className="inline-flex items-center gap-1 hover:text-foreground hover:underline transition-colors"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>Related articles</span>
                            </button>

                            {/* 4. Color-Coded Originality Shield Badge */}
                            <OriginalityShieldBadge
                              score={project.originalityScore ?? 100}
                              onClick={() => handleOpenDocument(project._id)}
                            />

                            {/* 5. Verified GitHub Link */}
                            {(project.githubRepoUrl || project.teamId?.githubLink) && (
                              <a
                                href={project.githubRepoUrl || project.teamId?.githubLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 hover:text-foreground hover:underline transition-colors text-primary font-medium"
                                title="Open Verified GitHub Repository"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Code2 className="w-3.5 h-3.5 text-primary" />
                                <span>Code Repo</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                              </a>
                            )}

                            {/* 6. Prototypes & Architecture Gallery */}
                            {Array.isArray(project.prototypes) && project.prototypes.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setPrototypeModalProject(project)}
                                className="inline-flex items-center gap-1 text-primary font-medium hover:underline transition-colors"
                                title="View system architecture & prototype media showcase"
                              >
                                <ImageIcon className="w-3.5 h-3.5 text-primary" />
                                <span>Prototypes ({project.prototypes.length})</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Right: Direct [PDF] Link */}
                        <div className="shrink-0 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDocument(project._id)}
                            className="min-h-11 sm:min-h-8 text-xs font-semibold text-primary hover:underline flex items-center gap-1 px-3 py-2 rounded-sm bg-muted/40 hover:bg-muted"
                            title="Read full manuscript PDF"
                          >
                            <FileText className="w-3.5 h-3.5 text-red-500" />
                            <span>[PDF] buksu.edu.ph</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Numbered Google-Style Pagination */}
            {!isLoading && pagination.pages > 1 && (
              <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{rangeStart}</span> to{' '}
                  <span className="font-semibold text-foreground">{rangeEnd}</span> of{' '}
                  <span className="font-semibold text-foreground">
                    {pagination.total.toLocaleString()}
                  </span>{' '}
                  entries
                </div>

                <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage(Math.max(1, pagination.page - 1))}
                    className="h-11 sm:h-8 px-2 text-xs"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>

                  <span className="text-sm text-muted-foreground sm:hidden">
                    Page {pagination.page} of {pagination.pages}
                  </span>

                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={pagination.page === pageNum ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className="hidden h-8 w-8 p-0 text-xs sm:inline-flex"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}

                  {pagination.pages > 5 && (
                    <>
                      <span className="hidden px-1 text-muted-foreground text-xs sm:inline">...</span>
                      <Button
                        variant={pagination.page === pagination.pages ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPage(pagination.pages)}
                        className="hidden h-8 w-8 p-0 text-xs sm:inline-flex"
                      >
                        {pagination.pages}
                      </Button>
                    </>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => setPage(Math.min(pagination.pages, pagination.page + 1))}
                    className="h-11 sm:h-8 px-2 text-xs"
                    aria-label="Next page"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Citation Export Modal (APA, IEEE, MLA, BibTeX) */}
      <CitationExportModal
        open={Boolean(citationModalProject)}
        project={citationModalProject}
        onClose={() => setCitationModalProject(null)}
      />

      {/* Related Articles Modal */}
      {similarModalProject && (
        <SimilarProjectModal
          project={similarModalProject}
          onClose={() => setSimilarModalProject(null)}
        />
      )}

      {/* Architecture & Prototype Showcase Modal */}
      <PrototypeGalleryModal
        open={Boolean(prototypeModalProject)}
        project={prototypeModalProject}
        onClose={() => setPrototypeModalProject(null)}
      />
    </DashboardLayout>
  );
}
