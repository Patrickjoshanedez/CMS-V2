import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';

const Badge = ({ label, tone }) => {
  const styles = {
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${styles[tone]}`}>{label}</span>
  );
};

Badge.propTypes = {
  label: PropTypes.string.isRequired,
  tone: PropTypes.oneOf(['green', 'blue', 'amber', 'slate']).isRequired,
};

const PanelistTopicCard = ({ topic, onSelect, selecting }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (topic.isAssigned) {
      navigate(`/projects/${topic._id}`);
    }
  };

  return (
    <article 
      onClick={handleCardClick}
      className={`bg-white rounded-xl border border-slate-200 p-5 space-y-3 ${
        topic.isAssigned 
          ? 'cursor-pointer hover:border-blue-400 hover:shadow-md transition-all duration-200' 
          : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold text-slate-900">{topic.title}</h4>
          <p className="text-sm text-slate-600">{topic.team?.name}</p>
        </div>
        {topic.isAssigned ? (
          <Badge label="Assigned" tone="green" />
        ) : (
          <Badge label="Available" tone="blue" />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge label={`Phase ${topic.capstonePhase}`} tone="slate" />
        <Badge
          label={`Panelists: ${topic.panelistCount}/3`}
          tone={topic.hasSlot ? 'amber' : 'slate'}
        />
        <Badge label={topic.titleStatus} tone="slate" />
      </div>

      <div className="text-sm text-slate-700 space-y-1">
        <p>
          <span className="font-medium">Adviser:</span> {topic.adviser}
        </p>
        <p>
          <span className="font-medium">Members:</span> {topic.team?.memberCount || 0}
        </p>
      </div>

      {!topic.isAssigned && topic.hasSlot && (
        <button
          onClick={() => onSelect(topic._id)}
          disabled={selecting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
        >
          {selecting ? 'Selecting...' : 'Select Topic'}
        </button>
      )}
    </article>
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
