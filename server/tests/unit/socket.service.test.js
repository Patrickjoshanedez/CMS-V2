import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { io as ClientIO } from 'socket.io-client';
import { generateAccessToken } from '../../utils/generateToken.js';
import {
  initializeSocket,
  resetSocket,
  emitToProject,
  emitToUser,
} from '../../services/socket.service.js';

describe('Phase 2: WebSocket Dispatcher & Defense Room Dispatching', () => {
  let server;
  let serverPort;
  let testToken;
  const testUserId = '654321654321654321654321';

  beforeEach(async () => {
    testToken = generateAccessToken({
      userId: testUserId,
      role: 'faculty',
      facultyRole: 'panelist',
    });

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
    resetSocket();
    await new Promise((resolve) => server.close(resolve));
  });

  it('authenticates statelessly and handles join:project and defense room dispatching', async () => {
    const client = ClientIO(`http://localhost:${serverPort}`, {
      auth: { token: testToken },
      transports: ['websocket'],
    });

    await new Promise((resolve, reject) => {
      client.on('connect', resolve);
      client.on('connect_error', reject);
    });

    expect(client.connected).toBe(true);

    // Test join:project
    const joinedPromise = new Promise((resolve) => {
      client.on('joined:project', (data) => {
        resolve(data);
      });
    });

    client.emit('join:project', 'project-alpha');
    const joinedData = await joinedPromise;
    expect(joinedData.projectId).toBe('project-alpha');

    // Test room broadcast to project
    const scorePromise = new Promise((resolve) => {
      client.on('defense:score_updated', (data) => {
        resolve(data);
      });
    });

    emitToProject('project-alpha', 'defense:score_updated', {
      projectId: 'project-alpha',
      totalScore: 92,
    });

    const receivedScore = await scorePromise;
    expect(receivedScore.totalScore).toBe(92);

    client.disconnect();
  });
});
