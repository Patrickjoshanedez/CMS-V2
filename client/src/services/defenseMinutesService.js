import api from './api';

export const defenseMinutesService = {
  getMinutes: (projectId, defenseType) => api.get(`/defense-minutes/${projectId}/${defenseType}`),

  addEntry: (projectId, defenseType, data) =>
    api.post(`/defense-minutes/${projectId}/${defenseType}/entries`, data),

  updateEntry: (projectId, defenseType, entryId, data) =>
    api.patch(`/defense-minutes/${projectId}/${defenseType}/entries/${entryId}`, data),

  deleteEntry: (projectId, defenseType, entryId) =>
    api.delete(`/defense-minutes/${projectId}/${defenseType}/entries/${entryId}`),

  finalizeVerdict: (projectId, defenseType, data) =>
    api.post(`/defense-minutes/${projectId}/${defenseType}/verdict`, data),

  lockCompositeScores: (projectId, defenseType, data) =>
    api.post(`/defense-minutes/${projectId}/${defenseType}/lock-scores`, data),

  publishToADM: (projectId, defenseType) =>
    api.post(`/defense-minutes/${projectId}/${defenseType}/publish-matrix`),
};

export default defenseMinutesService;
