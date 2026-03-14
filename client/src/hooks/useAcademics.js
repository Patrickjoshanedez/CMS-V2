import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { academicService } from '@/services/authService';

export const academicKeys = {
  all: ['academics'],
  courses: () => [...academicKeys.all, 'courses'],
  sections: (filters) => [...academicKeys.all, 'sections', filters],
  years: () => [...academicKeys.all, 'academic-years'],
  hierarchy: (filters) => [...academicKeys.all, 'hierarchy', filters],
};

function useAcademicMutation(mutationFn, options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options;

  return useMutation({
    mutationFn,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: academicKeys.all });
      onSuccess?.(...args);
    },
    onError,
    ...restOptions,
  });
}

export function useCourses(options = {}) {
  return useQuery({
    queryKey: academicKeys.courses(),
    queryFn: async () => {
      const { data } = await academicService.listCourses();
      return data.data.courses;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useCreateCourse(options = {}) {
  return useAcademicMutation(async (payload) => {
    const res = await academicService.createCourse(payload);
    return res.data;
  }, options);
}

export function useSections(filters = {}, options = {}) {
  return useQuery({
    queryKey: academicKeys.sections(filters),
    queryFn: async () => {
      const { data } = await academicService.listSections(filters);
      return data.data.sections;
    },
    staleTime: 3 * 60 * 1000,
    ...options,
  });
}

export function useCreateSection(options = {}) {
  return useAcademicMutation(async (payload) => {
    const res = await academicService.createSection(payload);
    return res.data;
  }, options);
}

export function useAcademicYears(options = {}) {
  return useQuery({
    queryKey: academicKeys.years(),
    queryFn: async () => {
      const { data } = await academicService.listAcademicYears();
      return data.data.academicYears;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useAcademicHierarchy(filters = {}, options = {}) {
  return useQuery({
    queryKey: academicKeys.hierarchy(filters),
    queryFn: async () => {
      const { data } = await academicService.getHierarchy(filters);
      return data.data.hierarchy;
    },
    staleTime: 60 * 1000,
    ...options,
  });
}
