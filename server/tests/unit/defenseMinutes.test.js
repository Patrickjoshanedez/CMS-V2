import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import defenseMinutesService from '../../modules/submissions/defenseMinutes.service.js';
import DefenseMinutes from '../../modules/submissions/defenseMinutes.model.js';
import Project from '../../modules/projects/project.model.js';
import Evaluation from '../../modules/evaluations/evaluation.model.js';
import Notification from '../../modules/notifications/notification.model.js';
import * as socketService from '../../services/socket.service.js';

describe('DefenseMinutes Service & ADM Secretary Endorsement Workflow', () => {
  const projectId = '65e000000000000000000010';
  const secretaryId = '65e000000000000000000011';
  const chairId = '65e000000000000000000012';
  const panelistId1 = '65e000000000000000000013';
  const panelistId2 = '65e000000000000000000014';
  const teamMemberId = '65e000000000000000000015';

  const mockSecretaryUser = {
    _id: secretaryId,
    firstName: 'Maria',
    lastName: 'Santos',
    email: 'maria@buksu.edu.ph',
  };

  const createQueryMock = (value) => ({
    select: vi.fn().mockImplementation(() => createQueryMock(value)),
    populate: vi.fn().mockImplementation(() => createQueryMock(value)),
    sort: vi.fn().mockImplementation(() => createQueryMock(value)),
    exec: vi.fn().mockResolvedValue(value),
    then: (resolve) => Promise.resolve(value).then(resolve),
  });

  let mockProject;
  let mockMinutes;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(socketService, 'emitToUser').mockImplementation(() => {});
    vi.spyOn(socketService, 'emitToRoom').mockImplementation(() => {});

    mockProject = {
      _id: projectId,
      title: 'Automated Agro-Climatic IoT Monitoring System',
      teamId: {
        _id: '65e000000000000000000020',
        name: 'Team Agro',
        members: [teamMemberId],
      },
      secretaryId,
      panelists: [
        { userId: chairId, role: 'chair' },
        { userId: panelistId1, role: 'member' },
        { userId: panelistId2, role: 'member' },
      ],
      actionDoneMatrix: [],
      admStatus: 'draft',
      admSignatures: {
        secretary: { endorsed: false },
        adviser: { signed: false },
        instructor: { signed: false },
        chair: { signed: false },
        panelists: [],
      },
      save: vi.fn().mockResolvedValue(true),
    };

    mockMinutes = {
      _id: '65e000000000000000000030',
      projectId,
      defenseType: 'proposal',
      sessionStatus: 'in_progress',
      entries: [],
      compositeScores: {
        isLocked: false,
      },
      consensusVerdict: {
        verdict: null,
      },
      matrixPublished: false,
      save: vi.fn().mockResolvedValue(true),
      populate: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(Project, 'findById').mockImplementation(() => createQueryMock(mockProject));
    vi.spyOn(DefenseMinutes, 'findOne').mockImplementation(() => createQueryMock(mockMinutes));
    vi.spyOn(DefenseMinutes, 'findById').mockImplementation(() => createQueryMock(mockMinutes));
    vi.spyOn(DefenseMinutes, 'create').mockResolvedValue(mockMinutes);
    vi.spyOn(Notification, 'insertMany').mockResolvedValue([
      { userId: teamMemberId, _id: 'notif-1' },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retrieves or initializes live defense minutes session', async () => {
    const result = await defenseMinutesService.getOrCreateMinutes(
      projectId,
      'proposal',
      mockSecretaryUser,
    );

    expect(result).toBeDefined();
    expect(result.defenseMinutes).toBeDefined();
    expect(result.defenseMinutes._id).toBe('65e000000000000000000030');
    expect(result.project.title).toBe('Automated Agro-Climatic IoT Monitoring System');
  });

  it('adds a revision critique entry and updates minutes', async () => {
    const entryData = {
      panelistName: 'Dr. John Doe',
      panelistId: chairId,
      critique: 'Clarify sampling methodology in Chapter 3',
      expectedAction: 'Detail the stratified sampling procedure',
      category: 'Methodology & Implementation',
      pageOrModule: 'p. 42',
      severity: 'major',
    };

    const result = await defenseMinutesService.addEntry(
      projectId,
      'proposal',
      entryData,
      mockSecretaryUser,
    );

    expect(result).toBeDefined();
    expect(result.entry.panelistName).toBe('Dr. John Doe');
    expect(result.entry.critique).toBe('Clarify sampling methodology in Chapter 3');
    expect(mockMinutes.entries.length).toBe(1);
    expect(mockMinutes.save).toHaveBeenCalled();
  });

  it('computes live scores and locks composite scores when verified', async () => {
    const mockEvaluations = [
      {
        panelistId: { _id: chairId, firstName: 'Louie', lastName: 'Labastida' },
        totalScore: 85,
        maxTotalScore: 100,
        status: 'submitted',
        decision: 'passed',
      },
      {
        panelistId: { _id: panelistId1, firstName: 'Raul', lastName: 'Lecaros' },
        totalScore: 80,
        maxTotalScore: 100,
        status: 'submitted',
        decision: 'passed',
      },
      {
        panelistId: { _id: panelistId2, firstName: 'Joseph', lastName: 'Abella' },
        totalScore: 90,
        maxTotalScore: 100,
        status: 'submitted',
        decision: 'passed',
      },
    ];

    vi.spyOn(Evaluation, 'find').mockImplementation(() => createQueryMock(mockEvaluations));

    const liveScores = await defenseMinutesService.computeLiveScores(projectId, 'proposal');
    expect(liveScores.totalPanelists).toBe(3);
    expect(liveScores.averageScore).toBe(85);
    expect(liveScores.passingThresholdMet).toBe(true);

    const lockResult = await defenseMinutesService.lockCompositeScores(
      projectId,
      'proposal',
      { confirmedByChair: true },
      mockSecretaryUser,
    );

    expect(lockResult.compositeScores.isLocked).toBe(true);
    expect(lockResult.compositeScores.averageScore).toBe(85);
    expect(lockResult.compositeScores.chairConfirmed).toBe(true);
    expect(mockMinutes.save).toHaveBeenCalled();
  });

  it('records consensus verdict with chair sign-off', async () => {
    const verdictPayload = {
      verdict: 'minor_revisions',
      remarks: 'Passed with minor revisions in literature review.',
      chairConfirmed: true,
    };

    const result = await defenseMinutesService.finalizeVerdict(
      projectId,
      'proposal',
      verdictPayload,
      mockSecretaryUser,
    );

    expect(result.consensusVerdict.verdict).toBe('minor_revisions');
    expect(result.consensusVerdict.chairConfirmed).toBe(true);
    expect(result.defenseMinutes.sessionStatus).toBe('concluded');
    expect(mockMinutes.save).toHaveBeenCalled();
  });

  it('publishes revision entries into Project Action Done Matrix rows with pending_developer_action status', async () => {
    mockMinutes.entries = [
      {
        _id: 'entry-101',
        panelistName: 'Dr. Jane Smith',
        critique: 'Include ERD normalization steps in Appendix B',
        expectedAction: 'Add 3NF normalization breakdown',
        category: 'Database Schema',
        pageOrModule: 'p. 78',
      },
      {
        _id: 'entry-102',
        panelistName: 'Engr. Bob Lee',
        critique: 'Add sensor calibration tolerances to Chapter 4',
        expectedAction: 'Include error margin metrics',
        category: 'Methodology & Implementation',
        pageOrModule: 'p. 95',
      },
    ];

    const result = await defenseMinutesService.publishToADM(
      projectId,
      'proposal',
      mockSecretaryUser,
    );

    expect(result.success).toBe(true);
    expect(mockProject.actionDoneMatrix.length).toBe(2);
    expect(mockProject.actionDoneMatrix[0].panelName).toBe('Dr. Jane Smith');
    expect(mockProject.actionDoneMatrix[0].suggestion).toBe(
      'Include ERD normalization steps in Appendix B',
    );
    expect(mockProject.admStatus).toBe('pending_developer_action');
    expect(mockProject.admSignatures.secretary.endorsed).toBe(false);
    expect(mockMinutes.matrixPublished).toBe(true);
    expect(mockProject.save).toHaveBeenCalled();
    expect(mockMinutes.save).toHaveBeenCalled();
  });
});
