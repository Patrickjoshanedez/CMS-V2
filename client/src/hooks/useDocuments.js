/**
 * React Query hooks for the Documents module.
 *
 * Provides query hooks (data fetching) and mutation hooks (write actions)
 * for Google Docs template management and per-project document CRUD.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '../services/documentService';

/* ────────── Query Keys ────────── */

export const documentKeys = {
  all: ['documents'],
  templates: () => [...documentKeys.all, 'templates'],
  templateList: (filters) => [...documentKeys.templates(), 'list', filters],
  templateDetail: (id) => [...documentKeys.templates(), 'detail', id],
  projectDocs: (projectId) => [...documentKeys.all, 'project', projectId],
  projectDocList: (projectId, filters) => [...documentKeys.projectDocs(projectId), 'list', filters],
  projectDocDetail: (projectId, docId) => [...documentKeys.projectDocs(projectId), 'detail', docId],
};

/* ────────── Template Query Hooks ────────── */

/**
 * Fetch paginated/filtered template list.
 */
export function useTemplates(filters = {}, options = {}) {
  return useQuery({
    queryKey: documentKeys.templateList(filters),
    queryFn: async () => {
      const { data } = await documentService.listTemplates(filters);
      return data.data; // { templates }
    },
    staleTime: 5 * 60 * 1000, // 5 min
    ...options,
  });
}

/**
 * Fetch a single template by ID.
 */
export function useTemplate(id, options = {}) {
  return useQuery({
    queryKey: documentKeys.templateDetail(id),
    queryFn: async () => {
      const { data } = await documentService.getTemplate(id);
      return data.data; // { template }
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/* ────────── Template Mutation Hooks ────────── */

/** Helper — invalidate all template-related queries after a mutation */
function useTemplateMutation(mutationFn, options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options;
  return useMutation({
    mutationFn,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.templates() });
      onSuccess?.(...args);
    },
    onError,
    ...restOptions,
  });
}

/** Create a new template (instructor) */
export function useCreateTemplate(options = {}) {
  return useTemplateMutation(async (data) => {
    const res = await documentService.createTemplate(data);
    return res.data;
  }, options);
}

/** Update template metadata (instructor) */
export function useUpdateTemplate(options = {}) {
  return useTemplateMutation(async ({ templateId, ...data }) => {
    const res = await documentService.updateTemplate(templateId, data);
    return res.data;
  }, options);
}

/** Delete a template (instructor) */
export function useDeleteTemplate(options = {}) {
  return useTemplateMutation(async (templateId) => {
    const res = await documentService.deleteTemplate(templateId);
    return res.data;
  }, options);
}

/* ────────── Project Document Query Hooks ────────── */

/**
 * Fetch documents for a specific project.
 */
export function useProjectDocuments(projectId, filters = {}, options = {}) {
  return useQuery({
    queryKey: documentKeys.projectDocList(projectId, filters),
    queryFn: async () => {
      const { data } = await documentService.listProjectDocuments(projectId, filters);
      return data.data; // { documents }
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 min
    ...options,
  });
}

/**
 * Fetch a single project document (with role-based embed URL).
 */
export function useProjectDocument(projectId, docId, options = {}) {
  return useQuery({
    queryKey: documentKeys.projectDocDetail(projectId, docId),
    queryFn: async () => {
      const { data } = await documentService.getProjectDocument(projectId, docId);
      return data.data; // { document }
    },
    enabled: !!projectId && !!docId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

/* ────────── Project Document Mutation Hooks ────────── */

/** Helper — invalidate project-document queries after a mutation */
function useProjectDocMutation(projectId, mutationFn, options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options;
  return useMutation({
    mutationFn,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.projectDocs(projectId) });
      onSuccess?.(...args);
    },
    onError,
    ...restOptions,
  });
}

/** Generate a new document for a project (from template or blank) */
export function useGenerateDocument(projectId, options = {}) {
  return useProjectDocMutation(
    projectId,
    async (data) => {
      const res = await documentService.generateDocument(projectId, data);
      return res.data;
    },
    options,
  );
}

/** Delete a project document */
export function useDeleteProjectDocument(projectId, options = {}) {
  return useProjectDocMutation(
    projectId,
    async (docId) => {
      const res = await documentService.deleteProjectDocument(projectId, docId);
      return res.data;
    },
    options,
  );
}
