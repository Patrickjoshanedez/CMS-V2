/**
 * Shared storage routing constants.
 * Keep key-root conventions centralized so server and client can align.
 */
export const STORAGE_BUCKETS = Object.freeze({
  PRIMARY_UPLOADS: 'cms-buksu-uploads',
});

export const STORAGE_ROOT_PREFIXES = Object.freeze({
  PROJECTS: 'projects',
  AVATARS: 'avatars',
  ARCHIVES: 'archives',
});

export const STORAGE_ARCHIVE_PREFIXES = Object.freeze({
  PROJECTS: `${STORAGE_ROOT_PREFIXES.ARCHIVES}/${STORAGE_ROOT_PREFIXES.PROJECTS}`,
  BULK: `${STORAGE_ROOT_PREFIXES.ARCHIVES}/bulk`,
});
