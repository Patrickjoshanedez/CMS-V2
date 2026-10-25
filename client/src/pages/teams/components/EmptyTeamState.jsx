import React from 'react';
import PropTypes from 'prop-types';
import { UsersRound, UserPlus, Ticket } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ROLES } from '@cms/shared';

export default function EmptyTeamState({ role, onCreateClick, onAcceptClick }) {
  const isStudent = role === ROLES.STUDENT;

  return (
    <EmptyState
      icon={UsersRound}
      iconVariant="square"
      title={isStudent ? 'No team yet' : 'No teams found'}
      description={
        isStudent
          ? 'Start by creating your own team or enter a 6-character invite code shared by a team leader to join an existing group.'
          : 'Teams will appear here once students form groups.'
      }
      actions={
        isStudent
          ? [
              { label: 'Create a Team', onClick: onCreateClick, icon: UserPlus, size: 'lg' },
              {
                label: 'I Have an Invite Code',
                onClick: onAcceptClick,
                icon: Ticket,
                variant: 'outline',
                size: 'lg',
              },
            ]
          : []
      }
    />
  );
}

EmptyTeamState.propTypes = {
  role: PropTypes.string,
  onCreateClick: PropTypes.func,
  onAcceptClick: PropTypes.func,
};
