import React from 'react';
import PropTypes from 'prop-types';
import { UsersRound, Sparkles, UserPlus, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ROLES } from '@cms/shared';

export default function EmptyTeamState({ role, onCreateClick, onAcceptClick }) {
  const isStudent = role === ROLES.STUDENT;

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-gradient-to-b from-muted/30 to-muted/60 px-5 py-12 sm:px-8 sm:py-20 text-center">
      <div className="relative mb-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 ring-4 ring-primary/5">
          <UsersRound className="h-10 w-10 text-primary" />
        </div>
        <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      </div>
      <h2 className="text-xl font-bold text-foreground">
        {isStudent ? 'No team yet' : 'No teams found'}
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
        {isStudent
          ? 'Start by creating your own team or enter a 6-digit invite code shared by a team leader to join an existing group.'
          : 'Teams will appear here once students form groups.'}
      </p>
      {isStudent && (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={onCreateClick} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Create a Team
          </Button>
          <Button size="lg" variant="outline" onClick={onAcceptClick} className="gap-2">
            <Ticket className="h-4 w-4" />I Have an Invite Code
          </Button>
        </div>
      )}
    </div>
  );
}

EmptyTeamState.propTypes = {
  role: PropTypes.string,
  onCreateClick: PropTypes.func,
  onAcceptClick: PropTypes.func,
};
