import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import http from 'http';
import { io as ClientIO } from 'socket.io-client';
import { generateAccessToken } from '../../utils/generateToken.js';
import User from '../../modules/users/user.model.js';
import Project from '../../modules/projects/project.model.js';
import Team from '../../modules/teams/team.model.js';
import Section from '../../modules/academics/section.model.js';
import { initializeSocket, resetSocket, emitToProject } from '../../services/socket.service.js';
import { canJoinProjectRoom } from '../../services/projectRoomAuthorization.js';

describe('Phase 2: WebSocket Dispatcher & Defense Room Dispatching', () => {
  let server;
  let serverPort;
  let testToken;
  const testUserId = '654321654321654321654321';
  const projectId = '123456789012345678901234';
  const faculty = {
    _id: testUserId,
    role: 'faculty',
    facultyRole: 'panelist',
    isActive: true,
    isVerified: true,
    sessionVersion: 0,
  };

  const query = (value) => ({
    select() {
      return this;
    },
    lean: async () => value,
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  });

  const waitForEvent = (client, event, timeoutMs = 3000) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Timed out waiting for ${event}`)),
        timeoutMs,
      );
      client.once(event, (payload) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });

  const waitForConnect = (client, timeoutMs = 3000) =>
    new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        client.off('connect', onConnect);
        client.off('connect_error', onConnectError);
      };
      const onConnect = () => {
        cleanup();
        resolve();
      };
      const onConnectError = (error) => {
        cleanup();
        reject(error);
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Timed out waiting for socket connection.'));
      }, timeoutMs);
      client.once('connect', onConnect);
      client.once('connect_error', onConnectError);
    });

  beforeEach(async () => {
    testToken = generateAccessToken({
      userId: testUserId,
      role: 'faculty',
      facultyRole: 'panelist',
      sessionVersion: 0,
    });

    vi.spyOn(User, 'findById').mockImplementation((userId) =>
      query(userId?.toString() === testUserId ? faculty : null),
    );
    vi.spyOn(Project, 'findById').mockImplementation((id) =>
      query(
        id?.toString() === projectId
          ? { adviserId: testUserId, teamId: null, sectionId: null }
          : null,
      ),
    );
    vi.spyOn(Team, 'findById').mockImplementation(() => query(null));
    vi.spyOn(Section, 'findById').mockImplementation(() => query(null));

    server = http.createServer();
    await new Promise((resolve) => {
      server.listen(0, () => {
        serverPort = server.address().port;
        resolve();
      });
    });

    initializeSocket(server);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await resetSocket();
    if (server?.listening) await new Promise((resolve) => server.close(resolve));
  });

  it('authenticates current assigned faculty and receives authorized project events', async () => {
    const client = ClientIO(`http://localhost:${serverPort}`, {
      auth: { token: testToken },
      transports: ['websocket'],
    });

    try {
      await waitForConnect(client);
      const joinedPromise = waitForEvent(client, 'joined:project');
      client.emit('join:project', projectId);
      expect((await joinedPromise).projectId).toBe(projectId);

      const scorePromise = waitForEvent(client, 'defense:score_updated');
      emitToProject(projectId, 'defense:score_updated', { projectId, totalScore: 92 });
      expect((await scorePromise).totalScore).toBe(92);
    } finally {
      client.disconnect();
    }
  });

  it('denies nonexistent projects and unrelated faculty without joining the room', async () => {
    Project.findById.mockImplementation(() => query(null));
    const client = ClientIO(`http://localhost:${serverPort}`, {
      auth: { token: testToken },
      transports: ['websocket'],
    });
    try {
      await waitForConnect(client);
      const deniedPromise = waitForEvent(client, 'join:project:denied');
      client.emit('join:project', projectId);
      expect((await deniedPromise).projectId).toBe(projectId);
    } finally {
      client.disconnect();
    }

    Project.findById.mockImplementation(() =>
      query({ adviserId: testUserId, teamId: null, sectionId: null }),
    );
    User.findById.mockImplementation(() => query({ ...faculty, _id: '654321654321654321654322' }));
    const unrelatedFaculty = ClientIO(`http://localhost:${serverPort}`, {
      auth: { token: testToken },
      transports: ['websocket'],
    });
    try {
      await waitForEvent(unrelatedFaculty, 'connect');
      const deniedPromise = waitForEvent(unrelatedFaculty, 'join:project:denied');
      unrelatedFaculty.emit('join:project', projectId);
      expect((await deniedPromise).projectId).toBe(projectId);
    } finally {
      unrelatedFaculty.disconnect();
    }
  });

  it('rejects stale session versions during the socket handshake', async () => {
    User.findById.mockImplementation(() => query({ ...faculty, sessionVersion: 1 }));
    const client = ClientIO(`http://localhost:${serverPort}`, {
      auth: { token: testToken },
      transports: ['websocket'],
    });
    try {
      const error = await waitForEvent(client, 'connect_error');
      expect(error.message).toContain('Session has been invalidated');
    } finally {
      client.disconnect();
    }
  });
});

describe('project room access policy', () => {
  const project = { adviserId: 'faculty-1', secretaryId: null, panelistIds: [] };

  it('permits assigned students and faculty only', () => {
    expect(
      canJoinProjectRoom(
        { _id: 'student-1', role: 'student', isActive: true, isVerified: true },
        { ...project, memberRoleAssignments: [{ userId: 'student-1' }] },
        null,
        null,
      ),
    ).toBe(true);
    expect(
      canJoinProjectRoom(
        { _id: 'faculty-1', role: 'faculty', isActive: true, isVerified: true },
        project,
        null,
        null,
      ),
    ).toBe(true);
  });

  it('denies unrelated users and archived-project students without membership', () => {
    expect(
      canJoinProjectRoom(
        { _id: 'student-2', role: 'student', isActive: true, isVerified: true },
        { ...project, isArchived: true },
        null,
        null,
      ),
    ).toBe(false);
    expect(
      canJoinProjectRoom(
        { _id: 'faculty-2', role: 'faculty', isActive: true, isVerified: true },
        project,
        null,
        null,
      ),
    ).toBe(false);
  });
});
