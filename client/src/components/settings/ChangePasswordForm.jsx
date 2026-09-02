import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Lock, AlertTriangle, Eye, EyeOff, Loader2, Check } from 'lucide-react';
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
          <Alert variant="default" className="border-green-500/50 bg-green-500/10">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              Password changed successfully.
            </AlertDescription>
          </Alert>
        )}
        <SettingRow label="Change Password" description="Update your account password.">
          <Button variant="outline" size="sm" onClick={() => setShow(true)}>
            <Lock className="mr-1.5 h-3.5 w-3.5" />
            Change
          </Button>
        </SettingRow>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Lock className="h-4 w-4 text-primary" />
        Change Password
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="settings-currentPassword">Current Password</Label>
        <div className="relative">
          <Input
            id="settings-currentPassword"
            type={showCurrent ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowCurrent(!showCurrent)}
            tabIndex={-1}
          >
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-newPassword">New Password</Label>
        <div className="relative">
          <Input
            id="settings-newPassword"
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowNew(!showNew)}
            tabIndex={-1}
          >
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          At least 8 characters with uppercase, lowercase, and a number.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-confirmPassword">Confirm New Password</Label>
        <Input
          id="settings-confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Password
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            resetForm();
            setShow(false);
          }}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
