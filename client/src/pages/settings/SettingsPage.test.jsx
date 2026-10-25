import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom';
import SettingsPage from './SettingsPage';

const authState = vi.hoisted(() => ({ user: null, fetchUser: vi.fn() }));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector) => {
    const state = { user: authState.user, fetchUser: authState.fetchUser };
    return typeof selector === 'function' ? selector(state) : state;
  },
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <main>{children}</main>,
}));

vi.mock('@/components/settings/AppearanceSection', () => ({
  default: () => <div>Appearance settings</div>,
}));
vi.mock('@/components/settings/SecuritySection', () => ({
  default: () => <div>Security settings</div>,
}));
vi.mock('@/components/settings/DigitalSignatureSection', () => ({
  default: () => <div>Signature settings</div>,
}));
vi.mock('@/components/settings/NotificationsSection', () => ({
  default: () => <div>Notification settings</div>,
}));
vi.mock('@/components/settings/AboutSection', () => ({
  default: () => <div>About settings</div>,
}));
vi.mock('@/components/settings/AdministrationSection', () => ({
  default: () => <div>Administration settings</div>,
}));

function QueryProbe() {
  const [searchParams] = useSearchParams();
  return <output data-testid="settings-query">{searchParams.toString()}</output>;
}

function renderSettings(user, initialEntry) {
  authState.user = user;
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/settings"
          element={
            <>
              <SettingsPage />
              <QueryProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SettingsPage tab access and URL state', () => {
  beforeEach(() => {
    authState.user = null;
    authState.fetchUser.mockClear();
  });

  afterEach(cleanup);

  it('keeps the legacy admin alias and synchronizes instructor tab selection to the URL', async () => {
    renderSettings({ role: 'instructor' }, '/settings?tab=admin');

    expect(screen.getByRole('tab', { name: 'Administration' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText('Administration settings')).toBeVisible();

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Security' }), {
      button: 0,
      ctrlKey: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId('settings-query')).toHaveTextContent('tab=security');
    });
    expect(screen.getByText('Security settings')).toBeVisible();
  });

  it('hides administration and repairs an unavailable tab for students', async () => {
    renderSettings({ role: 'student' }, '/settings?tab=administration');

    expect(screen.queryByRole('tab', { name: 'Administration' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Appearance' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText('Appearance settings')).toBeVisible();
    await waitFor(() => {
      expect(screen.getByTestId('settings-query')).toHaveTextContent('tab=appearance');
    });
  });
});
