import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const PanelistTopicCard = ({ topic, onSelect, selecting }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (topic.isAssigned) {
      navigate(`/projects/${topic._id}`);
    }
  };

  return (
    <Card
      className={`p-5 ${
        topic.isAssigned ? 'cursor-pointer transition-colors hover:border-primary/50' : ''
      }`}
    >
    <article
      onClick={handleCardClick}
      className="space-y-3"
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 p-0">
        <div>
          <h4 className="text-base font-semibold text-foreground">{topic.title}</h4>
          <p className="text-sm text-muted-foreground">{topic.team?.name}</p>
        </div>
        {topic.isAssigned ? (
          <Badge variant="success">Assigned</Badge>
        ) : (
          <Badge variant="secondary">Available</Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-3 p-0">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">Phase {topic.capstonePhase}</Badge>
        <Badge variant={topic.hasSlot ? 'warning' : 'secondary'}>
          Panelists: {topic.panelistCount}/3
        </Badge>
        <Badge variant="outline">{topic.titleStatus}</Badge>
      </div>

      <div className="space-y-1 text-sm text-muted-foreground">
        <p>
          <span className="font-medium">Adviser:</span> {topic.adviser}
        </p>
        <p>
          <span className="font-medium">Members:</span> {topic.team?.memberCount || 0}
        </p>
      </div>

      {!topic.isAssigned && topic.hasSlot && (
        <Button
          type="button"
          onClick={() => onSelect(topic._id)}
          disabled={selecting}
          className="w-full"
        >
          {selecting ? 'Selecting...' : 'Select Topic'}
        </Button>
      )}
      </CardContent>
    </article>
    </Card>
  );
};

PanelistTopicCard.propTypes = {
  topic: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    titleStatus: PropTypes.string,
    capstonePhase: PropTypes.number,
    adviser: PropTypes.string,
    panelistCount: PropTypes.number,
    hasSlot: PropTypes.bool,
    isAssigned: PropTypes.bool,
    team: PropTypes.shape({
      name: PropTypes.string,
      memberCount: PropTypes.number,
    }),
  }).isRequired,
  onSelect: PropTypes.func.isRequired,
  selecting: PropTypes.bool,
};

export default React.memo(PanelistTopicCard);
