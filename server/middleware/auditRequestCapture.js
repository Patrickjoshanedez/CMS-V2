import auditService from '../modules/audit/audit.service.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const EXCLUDED_PATH_PREFIXES = ['/api/audit'];
const GLOBALLY_CAPTURED_RESOURCES = new Set(['auth', 'teams', 'documents', 'notifications']);

const REDACTED_SEGMENT = '[REDACTED]';
const TOKEN_LIKE_SEGMENT_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9_-]{20,}$/;
const JWT_LIKE_SEGMENT_PATTERN = /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/;

const TARGET_TYPE_BY_RESOURCE = {
  auth: 'User',
  users: 'User',
  teams: 'Team',
  projects: 'Project',
  submissions: 'Submission',
  evaluations: 'Evaluation',
  settings: 'Settings',
};

function getTargetTypeFromPath(pathname) {
  const resource = pathname.replace(/^\/api\/?/, '').split('/')[0];
  return TARGET_TYPE_BY_RESOURCE[resource] || 'System';
}

function sanitizePath(pathname) {
  if (!pathname || pathname === '/') return pathname;

  const segments = pathname.split('/');
  const isTeamInviteTokenPath =
    segments[1] === 'api' &&
    segments[2] === 'teams' &&
    segments[3] === 'invites' &&
    (segments[5] === 'accept' || segments[5] === 'decline');

  return segments
    .map((segment, index) => {
      if (!segment) return segment;

      if (isTeamInviteTokenPath && index === 4) {
        return REDACTED_SEGMENT;
      }

      if (JWT_LIKE_SEGMENT_PATTERN.test(segment)) {
        return REDACTED_SEGMENT;
      }

      // Redact long mixed-case/digit opaque strings while preserving common IDs.
      if (TOKEN_LIKE_SEGMENT_PATTERN.test(segment) && !/^[a-f0-9]{24}$/i.test(segment)) {
        return REDACTED_SEGMENT;
      }

      return segment;
    })
    .join('/');
}

function shouldCaptureGlobalAudit(pathname) {
  const resource = pathname.replace(/^\/api\/?/, '').split('/')[0];

  if (GLOBALLY_CAPTURED_RESOURCES.has(resource)) {
    return true;
  }

  if (resource === 'submissions') {
    return pathname.includes('/plagiarism');
  }

  return false;
}

/**
 * Centralized, non-blocking request audit capture for successful mutating actions.
 * Explicit business-level logs remain the source of truth for domain-specific events.
 */
export default function auditRequestCapture(req, res, next) {
  res.on('finish', () => {
    if (!MUTATING_METHODS.has(req.method)) return;
    if (res.statusCode < 200 || res.statusCode >= 400) return;
    if (!req.user?._id) return;

    const pathname = (req.originalUrl || req.path || '').split('?')[0];
    if (EXCLUDED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;
    if (!shouldCaptureGlobalAudit(pathname)) return;

    const sanitizedPath = sanitizePath(pathname);

    const context = auditService.contextFromRequest(req);

    void auditService.log({
      action: `http.${req.method.toLowerCase()}`,
      actor: context.actor,
      actorRole: context.actorRole,
      targetType: getTargetTypeFromPath(pathname),
      targetId: null,
      description: `User performed ${req.method} ${sanitizedPath}`,
      metadata: {
        path: sanitizedPath,
        method: req.method,
        statusCode: res.statusCode,
      },
      ipAddress: context.ipAddress,
    });
  });

  next();
}
