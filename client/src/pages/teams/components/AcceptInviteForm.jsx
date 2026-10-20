import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useAuthStore } from '@/stores/authStore';
import { useAcceptInvite } from '@/hooks/useTeams';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Ticket, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AcceptInviteForm({ onCancel, initialToken = '' }) {
  const CODE_LENGTH = 6;
  const isInitialTokenLong = initialToken.length > CODE_LENGTH;
  const initialDigits = isInitialTokenLong
    ? Array(CODE_LENGTH).fill('')
    : initialToken
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, CODE_LENGTH)
        .split('');

  const [digits, setDigits] = useState(() => {
    const arr = [...initialDigits];
    while (arr.length < CODE_LENGTH) arr.push('');
    return arr;
  });
  const [longToken, setLongToken] = useState(isInitialTokenLong ? initialToken : '');
  const { fetchUser } = useAuthStore();

  const acceptInvite = useAcceptInvite({
    onSuccess: async () => {
      await fetchUser();
      toast.success('Invite accepted! You are now part of the team.');
      setDigits(Array(CODE_LENGTH).fill(''));
      setLongToken('');
      onCancel?.();
    },
    onError: (err) => {
      const errorCode = err?.response?.data?.error?.code;
      if (errorCode === 'PROFILE_INCOMPLETE') {
        toast.error('Please complete your profile (section and adviser) before joining a team.');
        return;
      }
      toast.error(err?.response?.data?.error?.message || 'Failed to accept invite.');
    },
  });

  const codeString = digits.join('');
  const isCodeComplete = codeString.length === CODE_LENGTH;
  const isTokenLike = longToken.length > CODE_LENGTH;

  const handleDigitChange = (index, value) => {
    const char = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = char;
      return next;
    });
    // Auto-advance
    if (char && index < CODE_LENGTH - 1) {
      const nextInput = document.getElementById(`invite-digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const prevInput = document.getElementById(`invite-digit-${index - 1}`);
      prevInput?.focus();
      setDigits((prev) => {
        const next = [...prev];
        next[index - 1] = '';
        return next;
      });
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData('text')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    if (pasted.length > CODE_LENGTH) {
      setLongToken(e.clipboardData.getData('text').trim());
      return;
    }
    const chars = pasted.slice(0, CODE_LENGTH).split('');
    setDigits(() => {
      const next = [...chars];
      while (next.length < CODE_LENGTH) next.push('');
      return next;
    });
    // Focus last filled or first empty
    const focusIdx = Math.min(chars.length, CODE_LENGTH - 1);
    setTimeout(() => document.getElementById(`invite-digit-${focusIdx}`)?.focus(), 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = isTokenLike ? longToken.trim() : codeString;
    acceptInvite.mutate(payload);
  };

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Ticket className="h-7 w-7" />
        </div>
        <CardTitle className="text-xl">Join a Team</CardTitle>
        <CardDescription className="text-sm">
          Enter the 6-character invite code shared by your team leader.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {acceptInvite.error && (
          <Alert variant="destructive" className="mb-5">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {acceptInvite.error?.response?.data?.error?.message ||
                'Invalid or expired invite code.'}
            </AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          {!isTokenLike && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-2" onPaste={handlePaste}>
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    id={`invite-digit-${i}`}
                    type="text"
                    inputMode="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={acceptInvite.isPending}
                    className="h-14 w-12 rounded-lg border-2 bg-muted/30 text-center text-xl font-bold uppercase tracking-widest transition-colors focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    autoComplete="off"
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Letters and numbers only &mdash; paste support included
              </p>
            </div>
          )}

          {isTokenLike && (
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm font-medium">Invite link detected</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">{longToken}</p>
            </div>
          )}
          <div className="flex justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={acceptInvite.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={acceptInvite.isPending || (!isCodeComplete && !isTokenLike)}
              className="min-w-[140px]"
            >
              {acceptInvite.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Join Team
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

AcceptInviteForm.propTypes = {
  onCancel: PropTypes.func,
  initialToken: PropTypes.string,
};
