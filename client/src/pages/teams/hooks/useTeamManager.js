import { useState, useCallback, useMemo } from 'react';

/**
 * useTeamManager Hook
 *
 * Encapsulates modal dialog states, search filtering, and selected target team states
 * across student and faculty views on TeamsPage.
 *
 * @param {Object} options
 * @param {Object} [options.user] - Currently authenticated user
 * @param {string} [options.initialSearchQuery=''] - Optional initial search query
 * @returns {Object} State values and memoized callbacks
 */
export function useTeamManager(options = {}) {
  const { user, initialSearchQuery = '', initialTeamId = null } = options;

  // Modal dialog states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isTransferLeaderModalOpen, setIsTransferLeaderModalOpen] = useState(false);
  const [isBulkInviteOpen, setIsBulkInviteOpen] = useState(false);
  const [isInspectRosterOpenState, setIsInspectRosterOpenState] = useState(false);
  const [isTemplateConfigOpen, setIsTemplateConfigOpen] = useState(false);
  const [isAssignCommitteeOpenState, setIsAssignCommitteeOpenState] = useState(false);

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [statusFilter, setStatusFilter] = useState('all');
  const [academicYear, setAcademicYear] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [filters, setFilters] = useState({});

  // Selected target team states
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId);
  const [inspectingTeam, setInspectingTeam] = useState(null);
  const [committeeModalTeam, setCommitteeModalTeam] = useState(null);

  // Computed modal states aligned with target objects
  const isInspectRosterOpen = Boolean(isInspectRosterOpenState || inspectingTeam);
  const isAssignCommitteeOpen = Boolean(isAssignCommitteeOpenState || committeeModalTeam);

  // Memoized handlers for modals
  const openInviteModal = useCallback(() => setIsInviteModalOpen(true), []);
  const closeInviteModal = useCallback(() => setIsInviteModalOpen(false), []);

  const openTransferLeaderModal = useCallback(() => setIsTransferLeaderModalOpen(true), []);
  const closeTransferLeaderModal = useCallback(() => setIsTransferLeaderModalOpen(false), []);

  const openBulkInvite = useCallback(() => setIsBulkInviteOpen(true), []);
  const closeBulkInvite = useCallback(() => setIsBulkInviteOpen(false), []);

  const setIsInspectRosterOpen = useCallback((open) => {
    const isOpen = Boolean(open);
    setIsInspectRosterOpenState(isOpen);
    if (!isOpen) {
      setInspectingTeam(null);
    }
  }, []);

  const openInspectRoster = useCallback((team) => {
    if (team) {
      setInspectingTeam(team);
      setSelectedTeamId(team._id || team);
    }
    setIsInspectRosterOpenState(true);
  }, []);

  const closeInspectRoster = useCallback(() => {
    setInspectingTeam(null);
    setIsInspectRosterOpenState(false);
  }, []);

  const openTemplateConfig = useCallback(() => setIsTemplateConfigOpen(true), []);
  const closeTemplateConfig = useCallback(() => setIsTemplateConfigOpen(false), []);

  const setIsAssignCommitteeOpen = useCallback((open) => {
    const isOpen = Boolean(open);
    setIsAssignCommitteeOpenState(isOpen);
    if (!isOpen) {
      setCommitteeModalTeam(null);
    }
  }, []);

  const openAssignCommittee = useCallback((team) => {
    if (team) {
      setCommitteeModalTeam(team);
    }
    setIsAssignCommitteeOpenState(true);
  }, []);

  const closeAssignCommittee = useCallback(() => {
    setCommitteeModalTeam(null);
    setIsAssignCommitteeOpenState(false);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setAcademicYear('');
    setSectionId('');
    setStatusFilter('all');
    setFilters({ page: 1 });
    setInspectingTeam(null);
    setIsInspectRosterOpenState(false);
    setSelectedTeamId(null);
    setSelectedTeam(null);
  }, []);

  return {
    // Current user context
    user,

    // Modal states and controllers
    isInviteModalOpen,
    setIsInviteModalOpen,
    openInviteModal,
    closeInviteModal,

    isTransferLeaderModalOpen,
    setIsTransferLeaderModalOpen,
    openTransferLeaderModal,
    closeTransferLeaderModal,

    isBulkInviteOpen,
    setIsBulkInviteOpen,
    openBulkInvite,
    closeBulkInvite,

    isInspectRosterOpen,
    setIsInspectRosterOpen,
    openInspectRoster,
    closeInspectRoster,

    isTemplateConfigOpen,
    setIsTemplateConfigOpen,
    openTemplateConfig,
    closeTemplateConfig,

    isAssignCommitteeOpen,
    setIsAssignCommitteeOpen,
    openAssignCommittee,
    closeAssignCommittee,

    // Search and filter states
    searchQuery,
    setSearchQuery,
    search: searchQuery,
    setSearch: setSearchQuery,

    statusFilter,
    setStatusFilter,
    academicYear,
    setAcademicYear,
    sectionId,
    setSectionId,
    filters,
    setFilters,
    resetFilters,

    // Selected target team states
    selectedTeam,
    setSelectedTeam,
    selectedTeamId,
    setSelectedTeamId,
    inspectingTeam,
    setInspectingTeam,
    committeeModalTeam,
    setCommitteeModalTeam,
  };
}
