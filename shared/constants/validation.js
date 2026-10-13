export const STRICT_EMAIL_REGEX =
  /^(?=.{6,254}$)(?![.])(?!.*[.]@)(?!.*\.\.)([A-Za-z0-9._%+-]+)@((?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63})$/;

export const BUKSU_INSTITUTIONAL_EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@(student\.)?buksu\.edu\.ph$/i;

export const isBuksuInstitutionalEmail = (email) => {
  if (typeof email !== 'string') return false;
  return BUKSU_INSTITUTIONAL_EMAIL_REGEX.test(email.trim());
};
