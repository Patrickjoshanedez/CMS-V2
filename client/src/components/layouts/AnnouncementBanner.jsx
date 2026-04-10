import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, AlertCircle } from 'lucide-react';
import api from '@/services/api';

/**
 * AnnouncementBanner — displays the system announcement from settings.
 *
 * Fetches settings from /api/settings and shows systemAnnouncement if present.
 * Users can dismiss the banner, which hides it until page reload.
 *
 * @example
 *   <AnnouncementBanner className="mb-4" />
 */
export default function AnnouncementBanner({ className = '' }) {
  const [dismissed, setDismissed] = useState(false);

  // Fetch system settings to get the announcement
  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data?.data || res.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  const announcement = settings?.systemAnnouncement?.trim() || '';

  if (isLoading || dismissed || !announcement) {
    return null;
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-md border-l-4 border-blue-500 bg-blue-50 p-4 dark:bg-blue-950 dark:border-blue-400 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-300 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
          System Announcement
        </p>
        <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">{announcement}</p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
        className="flex-shrink-0 text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
