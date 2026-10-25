import { useState } from 'react';
import { X } from 'lucide-react';
import PropTypes from 'prop-types';
import { useSettings } from '@/hooks/useSettings';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

/**
 * AnnouncementBanner — displays the system announcement from settings.
 *
 * Fetches settings via useSettings hook and shows systemAnnouncement if present.
 * Users can dismiss the banner, which hides it until page reload.
 *
 * @example
 *   <AnnouncementBanner className="mb-4" />
 */
export default function AnnouncementBanner({ className = '' }) {
  const [dismissed, setDismissed] = useState(false);

  // Fetch system settings using standard hook
  const { data: settings, isLoading } = useSettings();

  const announcement = settings?.systemAnnouncement?.trim() || '';

  if (isLoading || dismissed || !announcement) {
    return null;
  }

  return (
    <Alert variant="info" className={cn('pr-14', className)} aria-live="polite">
      <div className="min-w-0 break-words">
        <AlertTitle>System Announcement</AlertTitle>
        <AlertDescription className="mt-1">{announcement}</AlertDescription>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss announcement"
          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </Alert>
  );
}

AnnouncementBanner.propTypes = {
  className: PropTypes.string,
};
