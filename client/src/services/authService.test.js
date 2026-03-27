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