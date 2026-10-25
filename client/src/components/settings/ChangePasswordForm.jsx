import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { authService } from '@/services/authService';
import { SettingRow } from './SettingsShared';
import { toast } from 'sonner';

export default function ChangePasswordForm() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuthState = useAuthStore((state) => state.clearAuthState);
  const [show, setShow] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isGoogleOnly = user?.authProvider === 'google' && !user?.password;

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authService.changePassword({ currentPassword, newPassword });
      const responseData = response?.data || {};
      setSuccess(true);
      resetForm();
      setShow(false);
      clearAuthState();
      toast.success(responseData?.message || 'Password changed successfully. Please log in again.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to change password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isGoogleOnly) {
    return (
      <SettingRow
        label="Change Password"
        description="Your account uses Google sign-in. Password change is not available."
      >
        <Badge variant="outline" className="text-xs text-muted-foreground">
          Google Account
        </Badge>
      </SettingRow>
    );
  }

  if (!show) {
    return (
      <div className="space-y-3">
        {success && (
          <Alert variant="success">
            <AlertDescription>Password changed successfully.</AlertDescription>
          </Alert>
        )}
        <SettingRow label="Change Password" description="Update your account password.">
          <Button variant="outline" size="sm" onClick={() => setShow(true)}>
            Change
          </Button>
        </SettingRow>
      </div>
    );
  }

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit}>
        <fieldset className="space-y-4">
          <legend className="mb-2 flex w-full items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-base font-semibold text-foreground border-b border-border">
            <span>Update Account Password</span>
            <span className="text-xs font-normal text-muted-foreground">* Required</span>
          </legend>

          {error && (
            <Alert variant="destructive" aria-live="polite" aria-atomic="true">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="settings-currentPassword" className="text-sm font-medium">
              Current Password *
            </Label>
            <div className="relative">
              <Input
                id="settings-currentPassword"
                type={showCurrent ? 'text' : 'password'}
                className="pr-12"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                aria-required="true"
                autoComplete="current-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 size-8 min-h-8 min-w-8 -translate-y-1/2"
                onClick={() => setShowCurrent(!showCurrent)}
                aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settings-newPassword" className="text-sm font-medium">
              New Password *
            </Label>
            <div className="relative">
              <Input
                id="settings-newPassword"
                type={showNew ? 'text' : 'password'}
                className="pr-12"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                aria-required="true"
                aria-describedby="settings-newPassword-helper"
                minLength={8}
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 size-8 min-h-8 min-w-8 -translate-y-1/2"
                onClick={() => setShowNew(!showNew)}
                aria-label={showNew ? 'Hide new password' : 'Show new password'}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p id="settings-newPassword-helper" className="text-xs text-muted-foreground">
              At least 8 characters with uppercase, lowercase, and a number.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settings-confirmPassword" className="text-sm font-medium">
              Confirm New Password *
            </Label>
            <Input
              id="settings-confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              aria-required="true"
              autoComplete="new-password"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                resetForm();
                setShow(false);
              }}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              loadingText="Updating..."
              className="w-full sm:w-auto"
            >
              Update Password
            </Button>
          </div>
        </fieldset>
      </form>
    </Card>
  );
}
