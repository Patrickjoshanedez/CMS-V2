import { describe, it, expect, vi } from 'vitest';
import { authService, userService } from './authService';
import api from './api';

vi.mock('./api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('authService', () => {
  it('should call api.post for login with provided credentials', () => {
    const mockCredentials = { email: 'test@example.com', password: 'password123' };
    authService.login(mockCredentials);
    expect(api.post).toHaveBeenCalledWith('/auth/login', mockCredentials);
  });

  it('should call api.post for register with provided registration payload', () => {
    const mockPayload = { name: 'Test', email: 'test@example.com', password: 'password' };
    authService.register(mockPayload);
    expect(api.post).toHaveBeenCalledWith('/auth/register', mockPayload);
  });
});

describe('userService', () => {
  it('should call api.get for getMe', () => {
    userService.getMe();
    expect(api.get).toHaveBeenCalledWith('/users/me', {});
  });
});

describe('projectService.bulkUploadArchive', () => {
  it('should append academicYear to FormData and call api.post with /projects/archive/bulk', async () => {
    const { projectService } = await import('./authService');
    const mockFile = new File(['dummy'], 'paper.pdf', { type: 'application/pdf' });
    const payload = {
      title: 'Deep Learning for Remote Sensing',
      abstract: 'An abstract about remote sensing.',
      academicYear: '2024-2025',
      publicationYear: 2024,
      academicPaperFile: mockFile,
    };

    projectService.bulkUploadArchive(payload);

    expect(api.post).toHaveBeenCalled();
    const [endpoint, formData, config] = api.post.mock.calls[api.post.mock.calls.length - 1];
    expect(endpoint).toBe('/projects/archive/bulk');
    expect(formData.get('title')).toBe('Deep Learning for Remote Sensing');
    expect(formData.get('academicYear')).toBe('2024-2025');
    expect(formData.get('publicationYear')).toBe('2024');
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
  });

  it('should infer academicYear from publicationYear when academicYear is omitted', async () => {
    const { projectService } = await import('./authService');
    const payload = {
      title: 'Legacy Project',
      publicationYear: 2023,
    };

    projectService.bulkUploadArchive(payload);

    const [, formData] = api.post.mock.calls[api.post.mock.calls.length - 1];
    expect(formData.get('academicYear')).toBe('2023-2024');
  });
});
