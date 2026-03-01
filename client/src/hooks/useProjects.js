/**
 * React Query hooks for the Projects module.
 *
 * Provides query hooks (data fetching) and mutation hooks (write actions)
 * for capstone project management: creation, title workflow, adviser/panelist
 * assignment, deadlines, and project rejection.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../services/authService';

/* ────────── Query Keys ────────── */

export const projectKeys = {
  all: ['projects'],
  lists: () => [...projectKeys.all, 'list'],
  list: (filters) => [...projectKeys.lists(), filters],
  details: () => [...projectKeys.all, 'detail'],
  detail: (id) => [...projectKeys.details(), id],
  my: () => [...projectKeys.all, 'my'],
  prototypes: (id) => [...projectKeys.detail(id), 'prototypes'],
  archive: () => [...projectKeys.all, 'archive'],
  archiveSearch: (filters) => [...projectKeys.archive(), 'search', filters],
  certificate: (id) => [...projectKeys.detail(id), 'certificate'],
  reports: (filters) => [...projectKeys.all, 'reports', filters],
};

/* ────────── Query Hooks ────────── */

/**
 * Fetch the current student's team project.
 */
export function useMyProject(options = {}) {
  return useQuery({
    queryKey: projectKeys.my(),
    queryFn: async () => {
      const { data } = await projectService.getMyProject();
      return data.data.project;
    },
    ...options,
  });
}

/**
 * Fetch a single project by ID.
 */
export function useProject(id, options = {}) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      const { data } = await projectService.getProject(id);
      return data.data.project;
    },
    enabled: !!id,
    ...options,
  });
}

/**
 * Fetch paginated/filtered project list (faculty only).
 */
export function useProjects(filters = {}, options = {}) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: async () => {
      const { data } = await projectService.listProjects(filters);
      return data.data; // { projects, pagination }
    },
    ...options,
  });
}

/* ────────── Mutation Hooks ────────── */

/** Invalidate all project-related queries after a mutation */
function useProjectMutation(mutationFn, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      options.onSuccess?.(...args);
    },
    onError: options.onError,
    ...options,
  });
}

/** Create a new project */
export function useCreateProject(options = {}) {
  return useProjectMutation(async (data) => {
    const res = await projectService.createProject(data);
    return res.data;
  }, options);
}

/** Update title/abstract/keywords (draft stage) */
export function useUpdateTitle(options = {}) {
  return useProjectMutation(async ({ projectId, ...data }) => {
    const res = await projectService.updateTitle(projectId, data);
    return res.data;
  }, options);
}

/** Submit title for approval */
export function useSubmitTitle(options = {}) {
  return useProjectMutation(async (projectId) => {
    const res = await projectService.submitTitle(projectId);
    return res.data;
  }, options);
}

/** Revise and resubmit title after rejection */
export function useReviseAndResubmit(options = {}) {
  return useProjectMutation(async ({ projectId, ...data }) => {
    const res = await projectService.reviseAndResubmit(projectId, data);
    return res.data;
  }, options);
}

/** Request title modification (after approval) */
export function useRequestTitleModification(options = {}) {
  return useProjectMutation(async ({ projectId, ...data }) => {
    const res = await projectService.requestTitleModification(projectId, data);
    return res.data;
  }, options);
}

/** Approve a submitted title (instructor) */
export function useApproveTitle(options = {}) {
  return useProjectMutation(async (projectId) => {
    const res = await projectService.approveTitle(projectId);
    return res.data;
  }, options);
}

/** Reject a submitted title (instructor) */
export function useRejectTitle(options = {}) {
  return useProjectMutation(async ({ projectId, reason }) => {
    const res = await projectService.rejectTitle(projectId, { reason });
    return res.data;
  }, options);
}

/** Resolve a title modification request (instructor) */
export function useResolveTitleModification(options = {}) {
  return useProjectMutation(async ({ projectId, ...data }) => {
    const res = await projectService.resolveTitleModification(projectId, data);
    return res.data;
  }, options);
}

/** Assign an adviser to a project (instructor) */
export function useAssignAdviser(options = {}) {
  return useProjectMutation(async ({ projectId, adviserId }) => {
    const res = await projectService.assignAdviser(projectId, { adviserId });
    return res.data;
  }, options);
}

/** Assign a panelist to a project (instructor) */
export function useAssignPanelist(options = {}) {
  return useProjectMutation(async ({ projectId, panelistId }) => {
    const res = await projectService.assignPanelist(projectId, { panelistId });
    return res.data;
  }, options);
}

/** Remove a panelist from a project (instructor) */
export function useRemovePanelist(options = {}) {
  return useProjectMutation(async ({ projectId, panelistId }) => {
    const res = await projectService.removePanelist(projectId, { panelistId });
    return res.data;
  }, options);
}

/** Panelist self-selects into a project */
export function useSelectAsPanelist(options = {}) {
  return useProjectMutation(async (projectId) => {
    const res = await projectService.selectAsPanelist(projectId);
    return res.data;
  }, options);
}

/** Set deadlines (instructor/adviser) */
export function useSetDeadlines(options = {}) {
  return useProjectMutation(async ({ projectId, ...deadlines }) => {
    const res = await projectService.setDeadlines(projectId, deadlines);
    return res.data;
  }, options);
}

/** Reject an entire project (instructor) */
export function useRejectProject(options = {}) {
  return useProjectMutation(async ({ projectId, reason }) => {
    const res = await projectService.rejectProject(projectId, { reason });
    return res.data;
  }, options);
}

/* ────────── Phase Advancement ────────── */

/** Advance capstone phase (instructor) */
export function useAdvancePhase(options = {}) {
  return useProjectMutation(async (projectId) => {
    const res = await projectService.advancePhase(projectId);
    return res.data;
  }, options);
}

/* ────────── Prototype Hooks ────────── */

/** Fetch prototypes for a project */
export function usePrototypes(projectId, options = {}) {
  return useQuery({
    queryKey: projectKeys.prototypes(projectId),
    queryFn: async () => {
      const { data } = await projectService.getPrototypes(projectId);
      return data.data.prototypes;
    },
    enabled: !!projectId,
    ...options,
  });
}

/** Add a prototype link */
export function useAddPrototypeLink(options = {}) {
  return useProjectMutation(async ({ projectId, ...data }) => {
    const res = await projectService.addPrototypeLink(projectId, data);
    return res.data;
  }, options);
}

/** Upload prototype media (image/video) */
export function useAddPrototypeMedia(options = {}) {
  return useProjectMutation(async ({ projectId, formData }) => {
    const res = await projectService.addPrototypeMedia(projectId, formData);
    return res.data;
  }, options);
}

/** Remove a prototype */
export function useRemovePrototype(options = {}) {
  return useProjectMutation(async ({ projectId, prototypeId }) => {
    const res = await projectService.removePrototype(projectId, prototypeId);
    return res.data;
  }, options);
}

/* ────────── Archive & Completion Hooks ────────── */

/** Search the archive (any authenticated user) */
export function useArchiveSearch(filters = {}, options = {}) {
  return useQuery({
    queryKey: projectKeys.archiveSearch(filters),
    queryFn: async () => {
      const { data } = await projectService.searchArchive(filters);
      return data.data; // { projects, pagination }
    },
    keepPreviousData: true,
    ...options,
  });
}

/** Get certificate download URL */
export function useCertificateUrl(projectId, options = {}) {
  return useQuery({
    queryKey: projectKeys.certificate(projectId),
    queryFn: async () => {
      const { data } = await projectService.getCertificateUrl(projectId);
      return data.data; // { url }
    },
    enabled: !!projectId,
    staleTime: 30 * 60 * 1000, // 30 min — signed URLs last 1hr
    ...options,
  });
}

/** Generate reports (instructor) */
export function useProjectReports(filters = {}, options = {}) {
  return useQuery({
    queryKey: projectKeys.reports(filters),
    queryFn: async () => {
      const { data } = await projectService.generateReport(filters);
      return data.data.report;
    },
    ...options,
  });
}

/** Archive a project (instructor) */
export function useArchiveProject(options = {}) {
  return useProjectMutation(async ({ projectId, ...data }) => {
    const res = await projectService.archiveProject(projectId, data);
    return res.data;
  }, options);
}

/** Upload completion certificate (instructor) */
export function useUploadCertificate(options = {}) {
  return useProjectMutation(async ({ projectId, formData }) => {
    const res = await projectService.uploadCertificate(projectId, formData);
    return res.data;
  }, options);
}

/** Bulk upload legacy archive document (instructor) */
export function useBulkUploadArchive(options = {}) {
  return useProjectMutation(async (formData) => {
    const res = await projectService.bulkUploadArchive(formData);
    return res.data;
  }, options);
}
