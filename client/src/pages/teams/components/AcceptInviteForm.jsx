import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useAuthStore } from '@/stores/authStore';
import { useAcceptInvite } from '@/hooks/useTeams';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
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
    <Card className="mx-auto max-w-lg border border-border">
      <CardHeader className="border-b border-border bg-muted/50">
        <CardTitle className="text-lg font-semibold text-foreground">Join a Team</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Enter the 6-character invite code shared by your team leader. * Required
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        {acceptInvite.error && (
          <div role="alert" aria-live="polite" aria-atomic="true">
            <Alert variant="destructive" className="mb-5">
              <AlertDescription>
                {acceptInvite.error?.response?.data?.error?.message ||
                  'Invalid or expired invite code.'}
              </AlertDescription>
            </Alert>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          {!isTokenLike && (
            <fieldset className="flex flex-col items-center gap-3">
              <legend className="text-sm font-medium text-foreground">
                6-Character Team Invite Code *
              </legend>
              <div className="flex gap-2" onPaste={handlePaste}>
                {digits.map((digit, i) => (
                  <Input
                    key={i}
                    id={`invite-digit-${i}`}
                    type="text"
                    inputMode="text"
                    maxLength={1}
                    value={digit}
                    aria-label={`Invite code character ${i + 1} of ${CODE_LENGTH}`}
                    aria-required="true"
                    aria-describedby="invite-code-helper"
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={acceptInvite.isPending}
                    className="h-12 w-10 rounded-lg px-0 text-center text-lg font-semibold uppercase tracking-widest sm:h-14 sm:w-12"
                    autoComplete="off"
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <p id="invite-code-helper" className="text-xs text-muted-foreground">
                Letters and numbers only &mdash; paste support included
              </p>
            </fieldset>
          )}

          {isTokenLike && (
            <Alert variant="info" aria-live="polite">
              <AlertTitle>Invite link detected</AlertTitle>
              <AlertDescription className="break-all">{longToken}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={acceptInvite.isPending}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={acceptInvite.isPending || (!isCodeComplete && !isTokenLike)}
              className="w-full sm:w-auto sm:min-w-[140px]"
              loading={acceptInvite.isPending}
              loadingText="Joining team"
            >
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
