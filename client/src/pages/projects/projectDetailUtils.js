export function getProjectResolveErrorMessage(
  error,
  fallbackMessage = 'Failed to resolve modification.',
) {
  const apiMessage = error?.response?.data?.error?.message;
  if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
    return apiMessage;
  }

  const responseMessage = error?.response?.data?.message;
  if (typeof responseMessage === 'string' && responseMessage.trim().length > 0) {
    return responseMessage;
  }

  if (typeof error?.message === 'string' && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}
